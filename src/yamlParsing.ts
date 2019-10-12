import { readFileSync } from 'fs';
import { safeLoad } from 'js-yaml';
import { getLogger } from './logging';

const FILE_SUFFIX = '.yaml';

export const loadYamlConfiguration = (pathToFile: string): any => {
    if (pathToFile && pathToFile.endsWith(FILE_SUFFIX)) {
        const yamlConfig = safeLoad(readFileSync(pathToFile, 'utf8'));
        getLogger('unknown').debug(
            `Successfully loaded YAML config: ${pathToFile}`,
        );
        return yamlConfig;
    }
    getLogger('unknown').warn(`Skipping unsupported file: ${pathToFile}`);
    return undefined;
};

export const nameFromYamlConfig = (fileName: string): string =>
    fileName.substr(0, fileName.indexOf(FILE_SUFFIX));
