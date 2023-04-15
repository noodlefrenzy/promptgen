import {Command} from 'commander';
import * as fs from 'fs';
import {parse} from 'yaml';
import * as handlebars from 'handlebars';

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
    console.log(`options: ${options}`);
    console.log(`data: ${JSON.stringify(data)}`);
    console.log(`Attempting to load ${name}`);
    const promptYaml = fs.readFileSync(`./src/prompts/${name}.yaml`, 'utf8');
    const promptData = parse(promptYaml);
    console.log(`Loaded prompt data: ${JSON.stringify(promptData)}`);
    if (promptData.references) {
      for (const reference of promptData.references) {
        console.log(`Reference: ${reference}`);
        const referenceYaml = fs.readFileSync(
          `./src/prompts/${reference}.yaml`,
          'utf8'
        );
        const referenceData = parse(referenceYaml);
        console.log(`Loaded reference data: ${JSON.stringify(referenceData)}`);
        const partial = handlebars.compile(referenceData.template);
        handlebars.registerPartial(referenceData.name, partial);
      }
    }
    const template = handlebars.compile(promptData.template);
    console.log(`Compiled template:\n${template({topic: 'bugs'})}`);
  });

program.showHelpAfterError();

program.parse();
