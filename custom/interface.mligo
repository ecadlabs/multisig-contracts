type block_level = nat

type operator_info =
{
    allowed : bool;
    manager : address;
}

type proposal_info =
{
    actions     : unit -> operation list;
    approve     : bool; // whether the sender approves the proposal or not
    expires_at  : block_level;
}

type proposal =
{
    actions      : unit -> operation list;
    expires_at  : block_level;
    approvals   : address set;
}

// Parameter
type param =
| Propose of proposal_info
| Default
| Approve of nat
| Execute of nat
| Require of nat

// Storage
type storage =
{
    proposals       : (nat, proposal) big_map;
    managers        : address set;
    counter         : nat;
    required_conf   : nat;
    max_duration    : block_level;
    min_duration    : block_level;
}

type return = operation list * storage