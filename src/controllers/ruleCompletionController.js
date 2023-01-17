import { Range, Position, CompletionItem, CompletionItemKind, SnippetString } from 'vscode';
import * as vscode from 'vscode';
import { getAllRuleIds } from '../rules';


let extensionContext;

export function initialize(context) {
    extensionContext = context;
}

export const provider = {
    provideCompletionItems: (document, position, cancelToken, context) => {
        // Check that this is an ESLINT configuration file
        const eslintConfigFiles = extensionContext?.workspaceState.get('eslintConfigFiles') ?? [];
        if (!eslintConfigFiles.includes(document.fileName)) {
            return;
        }

        // TODO: only do it if its in the right place
        //      only in rules object (determined by the parser)

        // Determine if user is typing a new object key (assume ESLint rule)

        /*
            ^                       # beginning of string
            \{\s*                   # object opener and maybe whitespace
            (?:                     # group (prior rules in the object)
                [\"\'\`]?           # quote of some kind (maybe)
                @?[\/\w-]+          # rule text
                [\"\'\`]?           # quote of some kind (maybe)
                \s*:\s*             # separator (with any amount of whitespace)
                (?:                 # group (value)

                    (?:[\"\'\`]?\w+[\"\'\`]?)                                                  # simple severity option value
                    |                                                                          # OR
                    (?:\[\s*[\"\'\`]?\w+[\"\'\`]?\s*,\s*[^\[\]]*(?:\[[^\[\]]*\])*[^\[\]]*\])   # array option value

                    #  break apart array option value
                        \[                              # open bracket
                            \s*                         # whitespace (maybe)
                            [\"\'\`]?\w+[\"\'\`]?       # severity
                            \s*,\s*                     # comma (with or without whitespace)
                            [^\[\]]*                    # any amount of non array things
                            (?:\[[^\[\]]*\])*           # inner array (any number of these)
                            [^\[\]]*                    # any amount of non array things
                        \]                              # close bracket
                    # end break apart array option value

                )                   # close group (value)

                \s*,\s*             # comma and maybe whitespace
            )*                      # close group (zero or more)
            (?<q>[\"\'\`]?)         # current quote (if exists)
            (?<r>@?[\/\w-]*)        # start of current rule id (if exists)
            $                       # end of string
        */
        const regexp = /\{\s*(?:[\"\'\`]?@?[\/\w-]+[\"\'\`]?\s*:\s*(?:(?:[\"\'\`]?\w+[\"\'\`]?)|(?:\[\s*[\"\'\`]?\w+[\"\'\`]?\s*,\s*[^\[\]]*(?:\[[^\[\]]*\])*[^\[\]]*\]))\s*,\s*)*(?<q>[\"\'\`]?)(?<r>@?[\/\w-]*)$/;
        const beginningToCursor = new Range(0, 0, position.line, position.character);
        const textSoFar = document.getText(beginningToCursor);
        const matches = textSoFar.match(regexp);
        if (matches) {
            const {
                q: openQuote,
                r: ruleId
            } = matches.groups;

            const startIndex = position.character - ruleId.length - openQuote.length;
            const range = new Range(position.line, startIndex, position.line, Number.MAX_SAFE_INTEGER);

            const allRules = getAllRuleIds(document.fileName);
            // const severityOptions = '[${1|"error","warn","off"|}$0],'; // this works for severity in an array

            return allRules.map(rule => {
                // displays (label): rule
                const item = new CompletionItem(rule, CompletionItemKind.Property);
                // filtered by user typing (filterText)
                item.filterText = `${openQuote}${rule}`;
                // item.insertText = new SnippetString(`"${rule}": \${1|"error","warn","off"|},$0`);
                item.insertText = `"${rule}": `;
                item.range = range;

                // TODO: get rule description (from meta), defaulting to something standard (ESLint Rule ${rule} ??)
                // const docs = new vscode.MarkdownString(`Inserts the ${rule} ESLint rule`);
                // item.documentation = docs;
                // TODO: get URL for rule (from meta)
                // docs.baseUri = vscode.Uri.parse('http://example.com/a/b/c/');

                // TODO: put this here when config options autocomplete works
                // item.command = { command: 'editor.action.triggerSuggest' };

                return item;
            });
        }
    }
};
