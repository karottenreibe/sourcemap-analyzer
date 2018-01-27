const {SourceMapConsumer} = require('source-map');
const binarySearch = require('binary-search');
const fs = require('fs');
const pad = require('pad');
const chalk = require('chalk');

class SourceCode {

    constructor(code) {
        this.code = code;
        this.lines = code.split(/\r?\n/);
    }

    line(line) {
        return this.lines[line - 1];
    }

    eachLineNumber(fun) {
        for (let line = 1; line <= this.lines.length; line++) {
            fun(line);
        }
    }

    subString(inclusiveStartOffset, exclusiveEndOffset) {
        return this.code.substring(inclusiveStartOffset, exclusiveEndOffset);
    }

}

const sourceMapFile = process.argv[2]
const generatedFile = process.argv[3]
const sourceFile = process.argv[4]
const desiredSourceId = process.argv[5]

const rawSourceMap = JSON.parse(fs.readFileSync(sourceMapFile, 'utf8'));
const consumer = new SourceMapConsumer(rawSourceMap);

const originalCode = new SourceCode(fs.readFileSync(sourceFile, 'utf8').toString());
const generatedCode = new SourceCode(fs.readFileSync(generatedFile, 'utf8').toString());

console.log(`--> mappings for ${desiredSourceId}`);

class OffsetMappings {

    constructor(consumer, generatedCode, originalCode) {
        this.originalLineStartOffsets = [0];
        for (let i = 0; i < originalCode.code.length; i++) {
            if (originalCode.code[i] === '\n') {
                this.originalLineStartOffsets.push(i + 1);
            }
        }

        this.generatedLineStartOffsets = [0];
        for (let i = 0; i < generatedCode.code.length; i++) {
            if (generatedCode.code[i] === '\n') {
                this.generatedLineStartOffsets.push(i + 1);
            }
        }

        this.mappings = [];
        consumer.eachMapping(({source, generatedLine, generatedColumn, originalLine, originalColumn}) => {
            this.mappings.push({
                sourceId : source,
                generatedOffset: this.generatedLineStartOffsets[generatedLine - 1] + generatedColumn,
                originalOffset: this.originalLineStartOffsets[originalLine - 1] + originalColumn,
            });
        });

        this.mappings.sort((a, b) => a.originalOffset - b.originalOffset);
    }

    getOriginalLine(originalOffset) {
        const index = binarySearch(this.originalLineStartOffsets, originalOffset, (a, b) => a - b);
        if (index >= 0) {
            return index + 1;
        } else if (index === -1) {
            throw "insertionPoint === 0, should not happen";
        } else {
            // index = - insertionPoint - 1
            const insertionPoint = - index - 1;
            return insertionPoint;
        }
    }

    each(fun) {
        this.mappings.forEach(fun);
    }

}

const mappings = new OffsetMappings(consumer, generatedCode, originalCode);

class GeneratedOffsets {

    constructor(mappings) {
        this.offsets = [];
        this.sorted = false;
        mappings.each(({generatedOffset}) => this.addOffset(generatedOffset));
    }

    addOffset(offset) {
        this.offsets.push(offset);
        this.sorted = false;
    }

    getExclusiveEndOffset(offset) {
        this.sort();
        const index = binarySearch(this.offsets, offset, (a, b) => a - b);

        if (index === this.offsets.length - 1) {
            return Infinity;
        } else if (index >= 0) {
            // exact match
            return this.offsets[index + 1];
        } else {
            // index = - insertionPoint - 1
            const insertionPoint = - index - 1

            if (insertionPoint === this.offsets.length) {
                return Infinity;
            }
            return this.offsets[insertionPoint];
        }
    }

    sort() {
        if (this.sorted) {
            return;
        }
        this.offsets.sort((a, b) => a - b);
        this.sorted = true;
    }

}

const generatedOffsets = new GeneratedOffsets(mappings);

originalCode.eachLineNumber(currentLine => {

    const prefix = pad(currentLine + ":", 4);
    const originalSnippet = chalk.green(originalCode.line(currentLine));
    console.log(prefix + originalSnippet);

    let startOffset = Infinity;
    let endOffset = 0;
    mappings.each(({sourceId, generatedOffset, originalOffset}) => {
        if (sourceId !== desiredSourceId) {
            return;
        }

        const originalLine = mappings.getOriginalLine(originalOffset);
        if (originalLine !== currentLine) {
            return;
        }

        startOffset = Math.min(startOffset, generatedOffset);

        const generatedEndOffset = generatedOffsets.getExclusiveEndOffset(generatedOffset);
        endOffset = Math.max(endOffset, generatedEndOffset);
        const generatedSnippet = chalk.blue(generatedCode.subString(generatedOffset, generatedEndOffset));
        console.log(" | " + generatedSnippet);
    });

    if (startOffset === Infinity) {
        return;
    }

    const generatedSnippet = chalk.blue(generatedCode.subString(startOffset, endOffset));
    console.log(" > " + generatedSnippet);
});

