import { readFileSync } from 'fs';
import { safeLoad } from 'js-yaml';
import { getLogger } from './logging';

const FILE_SUFFIX = '.yaml';

export const loadYamlConfiguration = (pathToFile: string): any => {
    if (pathToFile && pathToFile.endsWith(FILE_SUFFIX)) {
        let yamlConfig = safeLoad(readFileSync(pathToFile, 'utf8'));
        getLogger('unknown').debug(`Successfully loaded YAML config: ${pathToFile}`);
        return yamlConfig;
    } else {
        getLogger('unknown').warn('Skipping unsupported file: ' + pathToFile);
    }
};

export const nameFromYamlConfig = (fileName: string): string => {
    return fileName.substr(0, fileName.indexOf(FILE_SUFFIX));
};