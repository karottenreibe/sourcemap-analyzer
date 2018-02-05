Helps you debug sourcemap problems.

# Prerequisites

For all commands, you'll need both the generated source file and its source map, e.g.
`main.js` and `main.js.map`. The source map must be named exactly like the generated JS
file and have the `.map` suffix.

# Visualize the source map for a source file

Use the `show` command and pass the path to the generated source file, the path to the
original source file to visualize and the ID of that file inside the source map. If you don't
know the ID, leave out this parameter and the tool will print a list of all available IDs.

    node src/index.js show main.js article-actions.component.js src/js/article/article-actions.component.js

# Resolve positions from the generated source back to original source file locations

Use the `resolve` command and pass the path to the generated source file, a 1-based line number and a 0-based column
number.

    node src/index.js resolve main.js 8 6623

