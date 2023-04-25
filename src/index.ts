import {Command} from 'commander';
import * as fs from 'fs';
import {parse} from 'yaml';
import * as handlebars from 'handlebars';
import * as path from 'path';
import * as winston from 'winston';

const logger = winston.createLogger({
  level: 'debug',
  transports: [
    new winston.transports.Console({
      level: 'info',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

function loadTemplate(promptRoot: string, templateName: string) {
  logger.debug(`Attempting to load ${templateName} from ${promptRoot}`);
  const promptYaml = fs.readFileSync(
    `${promptRoot}/${templateName}.yaml`,
    'utf8'
  );
  const promptData = parse(promptYaml);
  logger.debug(`Loaded prompt data: ${JSON.stringify(promptData)}`);
  if (promptData.references) {
    promptData.compiledReferences = [];
    for (const reference of promptData.references) {
      const referenceData = loadTemplate(promptRoot, reference);
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
function loadBindings(
  data: string[],
  options: any,
  defaultRoot = './bindings'
) {
  const bindings: {[key: string]: string} = {};
  logger.debug(`data: ${data}`);
  logger.debug(`options: ${JSON.stringify(options)}`);
  if (options.file) {
    const filePath = path.resolve(defaultRoot, options.file + '.yaml');
    if (!fs.existsSync(filePath)) {
      throw new Error(`Bindings file not found: ${filePath}`);
    }
    logger.debug(`Loading bindings from file: ${filePath}`);
    const fileData = fs.readFileSync(filePath, 'utf8');
    logger.debug(`Parsing YAML file: ${fileData}`);
    const fileBindings = parse(fileData);
    Object.assign(bindings, fileBindings);
  } else {
    Object.assign(bindings, toMap(data));
    logger.debug(
      `Converted ${JSON.stringify(data)} to bindings: ${JSON.stringify(
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
  .version('0.0.1')
  .option('-d, --debug', 'Enable debug logging');

program
  .command('prompt')
  .description('Generate the given prompt')
  .argument('<string>', 'prompt name')
  .option(
    '-f, --file <path>',
    'YAML file containing template data bindings (directory assumed to be ./bindings, .yaml extension assumed)'
  )
  .option('-r, --prompt-root <path>', 'Root path for prompts', './src/prompts')
  .argument('[data...]', 'Key value pairs of data to bind to the template')
  .action((name, data, options) => {
    if (program.opts().debug) {
      logger.transports[0].level = 'debug';
    }
    logger.debug(`program opts: ${JSON.stringify(program.opts())}`);
    logger.debug(`name: ${name}`);
    const template = loadTemplate(options.promptRoot, name);
    const bindings = loadBindings(data, options);
    logger.debug(`Bindings: ${JSON.stringify(bindings)}`);
    console.log(template.compiled(bindings));
  });

program.addHelpText(
  'after',
  `

Examples:
  $ promptgen prompt bing/research topic bugs
  $ promptgen prompt gpt/challenge-network -f challenge-personas
  $ promptgen prompt midjourney/gpt-to-mj -f midjourney-examples
`
);

program.showHelpAfterError();

program.parse();
