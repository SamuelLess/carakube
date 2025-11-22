#!/bin/bash
# Makefile tab completion script for Carakube
# Source this file in your shell profile: source scripts/makefile-completion.sh

_make_completion() {
    local cur prev
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    if [ "$COMP_CWORD" -eq 1 ]; then
        # Get all make targets from the Makefile
        local targets=$(make -qp 2>/dev/null | awk -F':' '/^[a-zA-Z0-9][^$#\/\t=]*:([^=]|$)/ {split($1,A,/ /);for(i in A)print A[i]}' | sort -u)
        
        COMPREPLY=( $(compgen -W "${targets}" -- ${cur}) )
    fi
    
    return 0
}

# Register the completion function for make
complete -F _make_completion make

# Also show help hint on first load
if [ -z "$CARAKUBE_COMPLETION_LOADED" ]; then
    export CARAKUBE_COMPLETION_LOADED=1
    echo "✓ Carakube Makefile completion enabled. Type 'make <TAB>' to see available targets."
    echo "  Run 'make help' for detailed descriptions."
fi

