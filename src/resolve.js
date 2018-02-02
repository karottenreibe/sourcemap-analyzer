const {SourceMapConsumer} = require('source-map');
const fs = require('fs');
const chalk = require('chalk');

const SourceCode = require('./sourcecode');

module.exports = function resolve(args) {
    const generatedFile = args[0];
    const sourceMapFile = args[0] + ".map";
    const line = parseInt(args[1], 10);
    const column = parseInt(args[2], 10);

    const rawSourceMap = JSON.parse(fs.readFileSync(sourceMapFile, 'utf8'));
    const consumer = new SourceMapConsumer(rawSourceMap);
    const originalPosition = consumer.originalPositionFor({
        line: line,
        column: column,
    });

    const generatedCode = new SourceCode(fs.readFileSync(generatedFile, 'utf8').toString());
    let snippet = generatedCode.line(line).substring(column, column + 200);
    if (snippet.length === 200) {
        snippet += "...";
    }

    console.log(`Line ${line}, column ${column} in the generated file ${generatedFile}:`);
    console.log(chalk.blue(snippet));

    if (originalPosition.source === null) {
        console.log(chalk.red("It maps to no original source file. It is likely part of code that was inserted by the compiler"));
        process.exit(1);
    }

    console.log(`It maps to line ${originalPosition.line}, column ${originalPosition.column} in the original source file ${originalPosition.source}`);
};

