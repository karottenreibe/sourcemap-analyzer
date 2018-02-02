module.exports = class SourceCode {

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

};

