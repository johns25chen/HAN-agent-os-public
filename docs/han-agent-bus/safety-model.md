# HAN Agent OS — Safety Model

HAN Agent OS treats agent execution as a controlled system.

Core safety rules:

- no hidden execution
- no guessed command mapping
- no reusable approval
- no fake receipts
- no silent agent substitution
- no automatic phase expansion
- no stable tag without closure

A live action should be allowed only when the action has:

- exact scope
- explicit approval
- verified agent identity
- concrete command mapping
- final pre-run check
- single-use execution
- receipt materialization
- rollback or no-op record
- post-run verification
