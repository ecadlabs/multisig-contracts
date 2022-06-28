#include "./interface.mligo"
#include "./propose.mligo"
#include "./approve.mligo"
#include "./execute.mligo"
#include "./require.mligo"


let main ((param, s): param * storage): return =
    match param with
    | Propose p -> [], propose (p, s)
    | Default -> [], s
    | Approve p -> [], approve (p, s)
    | Execute p -> execute (p, s)
    | Require p -> [], require (p, s)