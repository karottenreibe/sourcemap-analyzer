const {SourceMapConsumer} = require('source-map');
const binarySearch = require('binary-search');
const fs = require('fs');
const pad = require('pad');
const chalk = require('chalk');

const SourceCode = require('./sourcecode');

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

        this.sourceIds = {};
        this.mappings = [];
        consumer.eachMapping(({source, generatedLine, generatedColumn, originalLine, originalColumn}) => {
            this.sourceIds[source] = true;
            this.mappings.push({
                sourceId : source,
                generatedOffset: this.generatedLineStartOffsets[generatedLine - 1] + generatedColumn,
                originalOffset: this.originalLineStartOffsets[originalLine - 1] + originalColumn,
            });
        });

        this.mappings.sort((a, b) => a.originalOffset - b.originalOffset);
    }

    hasSourceId(sourceId) {
        return this.sourceIds[sourceId] || false;
    }

    getSourceIds() {
        return Object.keys(this.sourceIds);
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

module.exports = function show(args) {
    const generatedFile = args[0];
    const sourceMapFile = args[0] + ".map";
    const sourceFile = args[1];
    const desiredSourceId = args[2];

    const rawSourceMap = JSON.parse(fs.readFileSync(sourceMapFile, 'utf8'));
    const consumer = new SourceMapConsumer(rawSourceMap);

    const originalCode = new SourceCode(fs.readFileSync(sourceFile, 'utf8').toString());
    const generatedCode = new SourceCode(fs.readFileSync(generatedFile, 'utf8').toString());

    const mappings = new OffsetMappings(consumer, generatedCode, originalCode);
    if (!mappings.hasSourceId(desiredSourceId)) {
        console.log(chalk.red(`No mappings for ${desiredSourceId} in this mapping file`));
        console.log("Found the following source IDs:");
        mappings.getSourceIds().forEach(id => console.log("- " + id));
        process.exit(1);
    }

    console.log(`--> mappings for ${desiredSourceId}`);

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
};

