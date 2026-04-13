# Promptgen

CLI for managing and generating Foundation Model prompts using Rust.

> This project was ported from TypeScript to Rust to improve performance and cross-platform compatibility.

## Features

- Template-based prompt generation using Handlebars
- YAML-based template and variable binding definitions
- Support for template references and partials
- Command-line interface for easy usage

## Installation

With Rust installed, you can build the project using Cargo:

```
cargo build --release
```

The compiled binary will be available in `target/release/promptgen`.

## Structure

Prompts can be stored under `src\prompts` in hierarchical form for the target LLM (e.g. `bing`, `GPT4`, `Midjourney`). Prompts are written in a [yaml](https://yaml.org) file which makes it easy to store both the "prompt code" and metadata about that prompt.

### Project Structure

- `src/main.rs`: The main CLI application
- `src/prompts/`: Directory containing YAML prompt templates
- `bindings/`: Directory containing YAML binding files

### Prompt Format

The Prompt `yaml` format contains a few key components:

- name
  - Symbolic name allowing for easy reference from other prompts
- template
  - Template text for the prompt, written in [handlebars](https://crates.io/crates/handlebars) format
- description
  - Description for the user, explaining why they might want to use this prompt
- use-when
  - Description for the LLM, useful for skills-based prompts (e.g. if GPT4 needs to use Midjourney to do its work)
- inputs
  - Array of expected inputs to the prompt template (e.g. a research prompt might take a `topic`). Note currently that no type information is included.
- is-partial
  - Boolean for whether this prompt is meant to be used as a partial
- references
  - Array of references to other prompt templates (typically partials) that are then loaded and stored as partials so they can be referenced in the handlebars template.

Example template:
```yaml
name: ExampleTemplate
template: |
  This is an example template with a {{variable}}.
description: Example template description
use-when: you need an example
inputs: [variable]
is-partial: false
references: []
```

**Notes:**

Handlebars partial references should use the `name` of the referred-to template (e.g. bing/accurate has a `name` of `Accurate` so is referred to as `{{>Accurate}}` in the handlebars template).

The separation of `references` and use of `name` in this way allows simple swapping of behaviors - you can have multiple experiments with different ways of eliciting "accurate" behavior, and as long as all partials share the same `name` merely swapping the `references` will allow you to use the same handlebars template.

## Usage

```
Usage: promptgen [options] [command]

CLI for managing and generating Foundation Model prompts

Options:
  -V, --version                        output the version number
  -d, --debug                          Enable debug logging
  -h, --help                           display help for command

Commands:
  prompt [options] <name> [data...]    Generate the given prompt
  help                                 display help for command
```

Example commands:
```
# Using key-value pairs directly on the command line
promptgen prompt bing/research topic bugs

# Using a bindings file in the bindings directory
promptgen prompt gpt/challenge-network -f challenge-personas

# Using a different prompt root directory
promptgen prompt midjourney/gpt-to-mj -r /path/to/prompts -f midjourney-examples

# Enable debug output
promptgen --debug prompt bing/research topic bugs
```

## Bindings Format

Binding files are YAML files defining key-value pairs or more complex data structures:

```yaml
variable: value
another_variable: another value
array_variable:
  - item1
  - item2
nested_objects:
  property1: value1
  property2: value2
```

## Contributing

This project welcomes contributions and suggestions. Although this project is not (yet) under the Microsoft OSS banner, it has adopted the Microsoft Open Source Code of Conduct. For more information see the Code of Conduct FAQ or contact opencode@microsoft.com with any additional questions or comments.

## License

MIT License
