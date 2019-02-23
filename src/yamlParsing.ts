import { getLogger } from './logging';

const YAML = require('js-yaml');
const FS = require('fs');

const FILE_SUFFIX = '.yaml';

export const loadYamlConfiguration = (pathToFile: string): any => {
    if (pathToFile && pathToFile.endsWith(FILE_SUFFIX)) {
        const yamlConfig = YAML.safeLoad(FS.readFileSync(pathToFile, 'utf8'));
        getLogger('unknown').debug(
            `Successfully loaded YAML config: ${pathToFile}`,
        );
        return yamlConfig;
    }
    getLogger('unknown').warn(`Skipping unsupported file: ${pathToFile}`);
};

export const nameFromYamlConfig = (fileName: string): string =>
    fileName.substr(0, fileName.indexOf(FILE_SUFFIX));
