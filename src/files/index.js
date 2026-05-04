import { createProjectFile, createUserFile } from 'common/util';
import codeCpp from './skeletons/code.cpp?raw';
import codeJava from './skeletons/code.java?raw';
import codeJs from './skeletons/code.js?raw';
import rootReadme from './algorithm-visualizer/README.md?raw';
import scratchPaperReadme from './scratch-paper/README.md?raw';

const getName = filePath => filePath.split('/').pop();
const readProjectFile = (filePath, content) => createProjectFile(getName(filePath), content);
const readUserFile = (filePath, content) => createUserFile(getName(filePath), content);

export const CODE_CPP = readUserFile('skeletons/code.cpp', codeCpp);
export const CODE_JAVA = readUserFile('skeletons/code.java', codeJava);
export const CODE_JS = readUserFile('skeletons/code.js', codeJs);
export const ROOT_README_MD = readProjectFile('algorithm-visualizer/README.md', rootReadme);
export const SCRATCH_PAPER_README_MD = readProjectFile('scratch-paper/README.md', scratchPaperReadme);
