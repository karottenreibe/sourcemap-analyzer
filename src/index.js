const show = require('./show');
const resolve = require('./resolve');

const args = process.argv;
const command = args[2];
const commandArgs = args.slice(3);

switch (command) {
    case "show":
        show(commandArgs);
        break;
    case "resolve":
        resolve(commandArgs);
        break;
    default:
        console.error("You must specify one of the following commands: show, resolve");
        process.exit(1);
        break;
}

