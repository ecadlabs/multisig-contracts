// sets the number of required confirmations before execution
let require ((conf_num, s): nat * storage): storage =
    // sender must be a manager
    if not Set.mem (Tezos.get_sender ()) s.managers
    then failwith "MULTISIG_NOT_A_MANAGER"
    (* 
        required number must be between 2n (to avoid manager setting 1 confirmation)
        and managers list length
    *)
    else if conf_num < 2n && conf_num > Set.size s.managers
    then failwith "MULTISIG_INVALID_CONF_NUMBER"
    else
        { s with required_conf = conf_num }