local zmq     = require "lzmq"
local ztimer  = require "lzmq.timer"

IS_WINDOWS = package.config:sub(1,1) == "\\"

zassert = zmq.assert

function sleep(sec)
  ztimer.sleep(sec * 1000)
end

function s_sleep(msec)
  ztimer.sleep(msec)
end

function printf(fmt, ...)
  return io.write((string.format(fmt, ...)))
end

function fprintf(file, fmt, ...)
  return file:write((string.format(fmt, ...)))
end

function sprintf(fmt, ...)
  return (string.format(fmt, ...))
end

function randof(n)
  if type(n) == 'number' then
    return math.random(1, n) - 1
  end
  return n[math.random(1, #n)]
end

function getchar()
  io.read(1)
end

function s_dump_str(str)
  --  Dump the message as text or binary
  local function is_text(data)
    for i=1, #data do
      local c = data:byte(i)
      if (c < 32 or c > 127) then
        return false
      end
    end
    return true
  end

  local result = sprintf("[%03d] ", #str)

  if is_text(str) then
    result = result .. str
  else
    for i=1, #str do
      result = result .. sprintf("%02X", str:byte(i))
    end
  end

  return result
end

function s_dump_msg(msg)
  print("----------------------------------------")
  --  Process all parts of the message
  for _, data in ipairs(msg) do
    print(s_dump_str(data))
  end
end

function s_dump(socket)
  local msg = socket:recv_all()
  s_dump_msg(msg)
end

function s_unwrap(msg)
  local frame = table.remove(msg, 1)
  if msg[1] and (#msg[1]==0) then
    table.remove(msg, 1)
  end
  return frame
end

function s_wrap(msg, frame)
  table.insert(msg, 1, "")
  table.insert(msg, 1, frame)
  return msg
end
