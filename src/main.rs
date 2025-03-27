use clap::{Parser, Subcommand};
use handlebars::Handlebars;
use log::debug;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use serde_yaml::{self};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
struct TemplateData {
    name: Option<String>,
    template: String,
    description: Option<String>,
    #[serde(rename = "use-when")]
    use_when: Option<String>,
    inputs: Option<Vec<String>>,
    #[serde(rename = "is-partial")]
    is_partial: Option<bool>,
    references: Option<Vec<String>>,
    #[serde(skip)]
    compiled_references: Option<Vec<TemplateData>>,
}

#[derive(Parser, Debug)]
#[command(name = "promptgen")]
#[command(about = "CLI for managing and generating Foundation Model prompts", long_about = None)]
#[command(version = "1.0.0")]
struct Cli {
    #[arg(short, long)]
    debug: bool,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    #[command(about = "Generate the given prompt")]
    Prompt {
        #[arg(help = "prompt name")]
        name: String,

        #[arg(short, long, help = "YAML file containing template data bindings (directory assumed to be ./bindings, .yaml extension assumed)")]
        file: Option<String>,

        #[arg(short = 'r', long = "prompt-root", help = "Root path for prompts", default_value = "./src/prompts")]
        prompt_root: String,

        #[arg(help = "Key value pairs of data to bind to the template")]
        data: Vec<String>,
    },
}

fn load_template(prompt_root: &str, template_name: &str) -> TemplateData {
    debug!("Attempting to load {} from {}", template_name, prompt_root);
    
    let file_path = format!("{}/{}.yaml", prompt_root, template_name);
    let prompt_yaml = fs::read_to_string(&file_path)
        .unwrap_or_else(|_| panic!("Could not read template file: {}", file_path));
    
    let mut prompt_data: TemplateData = serde_yaml::from_str(&prompt_yaml)
        .unwrap_or_else(|e| panic!("Failed to parse YAML from {}: {}", file_path, e));

    debug!("Loaded prompt data: {:?}", prompt_data);
    
    if let Some(references) = &prompt_data.references {
        let mut compiled_references = Vec::new();
        let mut handlebars = Handlebars::new();
        
        for reference in references {
            let reference_data = load_template(prompt_root, reference);
            handlebars.register_template_string(
                reference_data.name.as_ref().unwrap_or(reference),
                &reference_data.template,
            ).expect("Failed to register template");
            
            compiled_references.push(reference_data);
        }
        
        prompt_data.compiled_references = Some(compiled_references);
    }
    
    prompt_data
}

fn to_map(data: &[String]) -> HashMap<String, Value> {
    let mut map = HashMap::new();
    
    let mut i = 0;
    while i + 1 < data.len() {
        map.insert(data[i].clone(), Value::String(data[i + 1].clone()));
        i += 2;
    }
    
    // Check if there's an unpaired element at the end
    if i < data.len() {
        // We have an odd number of elements, handle the last one
        eprintln!("Warning: Unpaired key '{}' found. Setting to empty string value.", data[i]);
        map.insert(data[i].clone(), Value::String(String::new()));
    }
    
    map
}

fn load_bindings(
    data: &[String],
    file: Option<&str>,
    default_root: &str,
) -> Value {
    debug!("data: {:?}", data);
    
    if let Some(file_name) = file {
        let file_path = Path::new(default_root)
            .join(format!("{}.yaml", file_name));
            
        if !file_path.exists() {
            panic!("Bindings file not found: {:?}", file_path);
        }
        
        debug!("Loading bindings from file: {:?}", file_path);
        
        let file_data = fs::read_to_string(&file_path)
            .unwrap_or_else(|_| panic!("Could not read bindings file: {:?}", file_path));
            
        debug!("Parsing YAML file: {}", file_data);
        
        serde_yaml::from_str(&file_data)
            .unwrap_or_else(|e| panic!("Failed to parse YAML bindings: {}", e))
    } else {
        let map = to_map(data);
        debug!("Converted {:?} to bindings: {:?}", data, map);
        Value::Object(serde_json::Map::from_iter(map.into_iter()))
    }
}

fn main() {
    let cli = Cli::parse();

    if cli.debug {
        env_logger::Builder::new()
            .filter_level(log::LevelFilter::Debug)
            .init();
    } else {
        env_logger::Builder::new()
            .filter_level(log::LevelFilter::Info)
            .init();
    }

    match &cli.command {
        Commands::Prompt { 
            name, 
            file, 
            prompt_root, 
            data 
        } => {
            debug!("name: {}", name);
            
            let template_data = load_template(prompt_root, name);
            let bindings = load_bindings(data, file.as_deref(), "./bindings");
            
            debug!("Bindings: {:?}", bindings);
            
            let mut handlebars = Handlebars::new();
            handlebars.register_template_string("template", &template_data.template)
                .expect("Failed to register template");
                
            // Register any partials from compiled references
            if let Some(refs) = &template_data.compiled_references {
                for r in refs {
                    if let Some(name) = &r.name {
                        handlebars.register_template_string(name, &r.template)
                            .expect("Failed to register partial template");
                    }
                }
            }
            
            let result = handlebars.render("template", &bindings)
                .expect("Failed to render template");
                
            println!("{}", result);
        }
    }

    // Help examples are shown through clap's built-in help system
}
