import {Command} from 'commander';
import * as fs from 'fs';
import {parse} from 'yaml';
import * as handlebars from 'handlebars';

function loadTemplate(templateName: string) {
  console.log(`Attempting to load ${templateName}`);
  const promptYaml = fs.readFileSync(
    `./src/prompts/${templateName}.yaml`,
    'utf8'
  );
  const promptData = parse(promptYaml);
  console.log(`Loaded prompt data: ${JSON.stringify(promptData)}`);
  if (promptData.references) {
    promptData.compiledReferences = [];
    for (const reference of promptData.references) {
      const referenceData = loadTemplate(reference);
      const partial = handlebars.compile(referenceData.template);
      handlebars.registerPartial(referenceData.name, partial);
      referenceData.compiled = partial;
      promptData.compiledReferences.push(referenceData);
    }
  }
  promptData.compiled = handlebars.compile(promptData.template);
  return promptData;
}

function toMap(data: string[]): {[key: string]: string} {
  const map: {[key: string]: string} = {};
  for (let i = 0; i < data.length; i += 2) {
    map[data[i]] = data[i + 1];
  }
  return map;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadBindings(options: string[], data: any) {
  const bindings: {[key: string]: string} = {};
  console.log(`options: ${options}`);
  console.log(`data: ${JSON.stringify(data)}`);
  if ('file' in data) {
    console.log(`Loading bindings from file: ${options[0]}`);
    const fileData = fs.readFileSync(options[0], 'utf8');
    const fileBindings = JSON.parse(fileData);
    Object.assign(bindings, fileBindings);
  } else {
    Object.assign(bindings, toMap(options));
    console.log(
      `Converted ${JSON.stringify(options)} to bindings: ${JSON.stringify(
        bindings
      )}`
    );
  }
  return bindings;
}

const program = new Command();

program
  .name('promptgen')
  .description('CLI for managing and generating Foundation Model prompts')
  .version('0.0.1');

program
  .command('prompt')
  .description('Generate the given prompt')
  .argument('<string>', 'prompt name')
  .option('-f, --file', 'JSON file containing template data bindings')
  .argument('[data...]', 'Key value pairs of data to bind to the template')
  .action((name, options, data) => {
    console.log(`name: ${name}`);
    const template = loadTemplate(name);
    const bindings = loadBindings(options, data);
    console.log(`Bindings: ${JSON.stringify(bindings)}`);
    console.log(`Compiled template:\n${template.compiled(bindings)}`);
  });

program.showHelpAfterError();

program.parse();
