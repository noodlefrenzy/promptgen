# promptgen

CLI for managing and generating Foundation Model prompts

## Structure

Prompts can be stored under `src\prompts` in hierarchical form for the target LLM (e.g. `bing`, `GPT4`, `Midjourney`). Prompts are written in a [yaml](https://yaml.org) file which makes it easy to store both the "prompt code" and metadata about that prompt, using the following format.

### Prompt Format

The Prompt `yaml` format contains a few key components:

- name
  - Symbolic name allowing for easy reference from other prompts
- template
  - Template text for the prompt, written in [handlebarsjs](https://handlebarsjs.com/) format
- description
  - Description for the user, explaining why they might want to use this prompt
- use-when
  - Description for the LLM, useful for skills-based prompts (e.g. if GPT4 needs to use Midjourney to do its work)
- inputs
  - Array of expected inputs to the prompt template (e.g. a research prompt might take a `topic`). Note currently that no type information is included.
- is-partial
  - Boolean for whether this 
- references
  - Array of references to other prompt templates (typically partials) that are then loaded and stored as partials so they can be referenced in the handlebars template.

**Notes:**

Handlebars partial references should use the `name` of the referred-to template (e.g. bing/accurate has a `name` of `Accurate` so is referred to as `{{>Accurate}}` in the handlebars template).

The separation of `references` and use of `name` in this way allows simple swapping of behaviors - you can have multiple experiments with different ways of eliciting "accurate" behavior, and as long as all partials share the same `name` merely swapping the `references` will allow you to use the same handlebars template. 

The goal is to allow command-line overriding of the references to make that sort of experimentation easier.

## Usage

```
Usage: promptgen [options] [command]

CLI for managing and generating Foundation Model prompts

Options:
  -V, --version                        output the version number
  -h, --help                           display help for command

Commands:
  prompt [options] <string> [data...]  Generate the given prompt
  help [command]                       display help for command

Examples:
  $ node ./build/src/index.js prompt bing/research topic bugs
  $ node ./build/src/index.js prompt gpt/challenge-network -f bindings.json
```

```
Usage: promptgen prompt [options] <string> [data...]

Generate the given prompt

Arguments:
  string      prompt name
  data        Key value pairs of data to bind to the template

Options:
  -f, --file  JSON file containing template data bindings
  -h, --help  display help for command
```
