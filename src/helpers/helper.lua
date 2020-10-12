require "zhelpers"
local zmq = require "lzmq"
local json = require "json"
-- sudo luarocks install uuid
local socket = require("socket")  -- gettime() has higher precision than os.time()
local uuid = require("uuid")
uuid.seed()

room = {}

local MY_ID_STR = "1999"
local RPC_URL = os.getenv("PROG_SPACE_SERVER_URL")
if RPC_URL == nil then
    RPC_URL = "localhost"
end
local server_listening = false
local init_ping_id = uuid()
local SUBSCRIPTION_ID_LEN = #init_ping_id
subscription_ids = {}
my_prehooks = {}
my_subscriptions = {}

-- Prepare our context and publisher
local context = zmq.context()
local client = nil

function subscribe(query_strings, callback)
    subscription_id = uuid()
    query = {id = subscription_id, facts = query_strings}
    query_msg = json.encode(query)
    subscription_ids[subscription_id] = callback
    msg = "SUBSCRIBE" .. MY_ID_STR .. query_msg
    print(msg)
    local err_sub = client:send_multipart{msg}
    print("send sub!")
    print(err_sub)
end

function room.prehook(callback)
    my_prehooks[#my_prehooks + 1] = callback
end

function room.on(query_strings, callback)
    my_subscriptions[#my_subscriptions + 1] = {query_strings, callback}
end

function parse_results(val)
    local json_val = json.decode(val)
    local results = {}
    for i = 1, #json_val do
        print(json_val[i])
        local result = json_val[i]
        local new_result = {}
        for key, val in pairs(result) do  -- Table iteration.
            print(key, val)
            print(val[0], val[1], val[2])
            local value_type = val[1]
            if value_type == "integer" then
                new_result[key] = tonumber(val[2])
            elseif value_type == "float" then
                new_result[key] = tonumber(val[2])
            else
                new_result[key] = tostring(val[2])
            end
        end
        results[#results + 1] = new_result
    end
    return results
end

function room.listen(blocking)
    flags = 0
    if blocking == false then
        flags = 1 -- zmq.NOBLOCK
    end
    local raw_msg = client:recv_multipart(flags)
    print("received!")
    print(raw_msg)
    if raw_msg ~= nil then
        if #raw_msg > 0 then
            print(raw_msg[1])
            msg_string = raw_msg[1]
            -- 1999b4a4f075-9fde-41ae-c1cb-bea4ea0b2b381584545958956[{}]
            local source_len = 4
            local server_send_time_len = 13
            local id = string.sub(msg_string, source_len + 1, source_len + SUBSCRIPTION_ID_LEN)
            local val = string.sub(msg_string, source_len + 1 + SUBSCRIPTION_ID_LEN + server_send_time_len)
            print("ID")
            print(id)
            print("VAL")
            print(val)
            if id == init_ping_id then
                server_listening = true
            elseif subscription_ids[id] ~= nil then
                print("Found matching sub id")
                local callback = subscription_ids[id]
                local parsed_results = parse_results(val)
                callback(parsed_results)
            end
        end
    end
    print("TODO")
end

function room.claim(batch_claims)
    local err = client:send_multipart{"....BATCH" .. MY_ID_STR .. json.encode(batch_claims)}
    print(err)
end

function room.get_my_id_str()
    return MY_ID_STR
end

function room.init(skipListening, passed_in_my_id_str)
    print("room init")
    MY_ID_STR = passed_in_my_id_str
    client, err = context:socket(zmq.DEALER, {
        identity = MY_ID_STR;
        connect = "tcp://" .. RPC_URL .. ":5570";
    })
    zassert(client, err)
    print("room connected")
    print(".....PING" .. MY_ID_STR .. init_ping_id)
    -- TODO: set MY_ID, MY_ID_STR
    local err = client:send_multipart{".....PING" .. MY_ID_STR .. init_ping_id}
    print(err)
    print(type(err))
    print("room sent ping")
    room.listen(true)  -- assumes the first message recv'd will be the PING response
    print("received ping response")

    for i = 1, #my_prehooks do
        my_prehooks[i]()
    end

    for i = 1, #my_subscriptions do
        local query = my_subscriptions[i][1]
        local callback = my_subscriptions[i][2]
        subscribe(query, callback)  
    end

    if skipListening then
        return
    end

    while true do
        room.listen(true)
    end
end

return room
