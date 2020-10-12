require "zhelpers"
local room = require "helper"
local json = require "json"
local matrix = require "matrix"

COMBINED_TRANSFORM = love.math.newTransform()
COMBINED_TRANSFORM:setMatrix(
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
)

graphics_cache = {}
font = false
font_cache = {}
image_cache = {}
is_first_update = true

local colors = {
    white={255, 255, 255},
    red={255, 0, 0},
    green={0, 255, 0},
    blue={0, 0, 255},
    black={0, 0, 0},
    yellow={255, 255, 0},
    purple={128, 0, 128},
    cyan={0, 255, 255},
    orange={255, 165, 0},
}

function convertFromMatrixTermsToTransform(M11, M12, M13, M21, M22, M23, M31, M32, M33)
    -- https://forum.openframeworks.cc/t/quad-warping-an-entire-opengl-view-solved/509/10
    local transform = love.math.newTransform()
    transform:setMatrix(
        M11, M12, 0, M13,
        M21, M22, 0, M23,
        0,   0,   1, 0,
        M31, M32, 0, 1
    )
    return transform
end

function love.load(args)
    local MY_ID_STR = "1999"
    if #args >= 1 then
        MY_ID_STR = args[1]
        print("Set MY_ID_STR to:")
        print(MY_ID_STR)
    end
    
    room.on({"$ $ draw graphics $graphics on " .. MY_ID_STR}, function(results)
        graphics_cache = {}
        graphics_cache[#graphics_cache + 1] = {type="__RESET__"}
        for i = 1, #results do
            local parsedGraphics = json.decode(results[i].graphics)
            for g = 1, #parsedGraphics do
                graphics_cache[#graphics_cache + 1] = parsedGraphics[g]
            end
            graphics_cache[#graphics_cache + 1] = {type="__RESET__"}
        end
    end)

    -- TODO: update this now that the claims have changed:
    room.on({"$ $ wish calibration for " .. MY_ID_STR .. " is $M11 $M12 $M13 $M21 $M22 $M23 $M31 $M32 $H33"}, function(results)
        -- MYX where Y is row and X is columns
        for i = 1, #results do
            local screenToCalendarTransform = convertFromMatrixTermsToTransform(
                results[i].M11,
                results[i].M12,
                results[i].M13,
                results[i].M21,
                results[i].M22,
                results[i].M23,
                results[i].M31,
                results[i].M32,
                results[i].M33
            )
            COMBINED_TRANSFORM = screenToCalendarTransform:clone()
        end
    end)

    love.window.setTitle('Room Graphics')
    love.window.setFullscreen( true )
    love.graphics.setBackgroundColor(0, 0, 0)
    font = love.graphics.newFont("Inconsolata-Regular.ttf", 72)
    font_cache[72] = font
    love.mouse.setVisible(false)
    room.init(true, MY_ID_STR)
end

function love.draw()
    -- TODO: set baseline things
    is_fill_on = true
    fill_color = {1, 1, 1}
    is_stroke_on = true
    stroke_color = {1, 1, 1}
    stroke_width = 1
    love.graphics.setLineWidth( stroke_width )
    font_color = {1, 1, 1}
    local defaultFontSize = 72;
    local fontSize = 72
    love.graphics.setFont(font)

    love.graphics.replaceTransform(COMBINED_TRANSFORM)

    for i = 1, #graphics_cache do
        local g = graphics_cache[i]
        local opt = g.options
        if g.type == "__RESET__" then
            is_fill_on = true
            fill_color = {1, 1, 1}
            is_stroke_on = true
            stroke_color = {1, 1, 1}
            stroke_width = 1
            love.graphics.setLineWidth( stroke_width )
            font_color = {1, 1, 1}
            fontSize = defaultFontSize
            font = font_cache[defaultFontSize]
            love.graphics.setFont(font)
            love.graphics.replaceTransform(COMBINED_TRANSFORM)
        elseif g.type == "rectangle" then
            if is_fill_on then
                love.graphics.setColor(fill_color)
                love.graphics.rectangle("fill", opt.x, opt.y, opt.w, opt.h)
            end
            if is_stroke_on then
                love.graphics.setColor(stroke_color)
                love.graphics.rectangle("line", opt.x, opt.y, opt.w, opt.h)
            end
        elseif g.type == "ellipse" then
            if is_fill_on then
                love.graphics.setColor(fill_color)
                love.graphics.ellipse("fill", opt.x + opt.w * 0.5, opt.y + opt.h * 0.5, opt.w * 0.5, opt.h * 0.5)
            end
            if is_stroke_on then
                love.graphics.setColor(stroke_color)
                love.graphics.ellipse("line", opt.x + opt.w * 0.5, opt.y + opt.h * 0.5, opt.w * 0.5, opt.h * 0.5)
            end
        elseif g.type == "line" then
            if is_stroke_on then
                love.graphics.setColor(stroke_color)
                love.graphics.line(opt[1], opt[2], opt[3], opt[4])
            end
        elseif g.type == "polygon" then
            local vertices = {}
            for j = 1, #opt do
                vertices[j*2 - 1] = opt[j][1]
                vertices[j*2] = opt[j][2]
            end
            if is_fill_on then
                love.graphics.setColor(fill_color)
                love.graphics.polygon('fill', vertices)
            end
            if is_stroke_on then
                love.graphics.setColor(stroke_color)
                love.graphics.polygon('line', vertices)
            end
        elseif g.type == "text" then
            love.graphics.setColor(font_color)
            love.graphics.print(opt.text, opt.x, opt.y)
            -- local lineHeight = fontSize * 1.3
            -- for line in opt.text:gmatch("([^\n]*)\n?") do
            --     love.graphics.print(line, opt.x, opt.y + i * lineHeight)
            -- end
        elseif g.type == "fill" then
            is_fill_on = true
            if type(opt) == "string" then
                if colors[opt] ~= nill then
                    fill_color = colors[opt]
                end
            elseif #opt == 3 then
                fill_color = {opt[1]/255, opt[2]/255, opt[3]/255}
            elseif #opt == 4 then
                fill_color = {opt[1]/255, opt[2]/255, opt[3]/255, opt[4]/255}
            end
        elseif g.type == "stroke" then
            is_stroke_on = true
            if type(opt) == "string" then
                if colors[opt] ~= nill then
                    stroke_color = colors[opt]
                end
            elseif #opt == 3 then
                stroke_color = {opt[1]/255, opt[2]/255, opt[3]/255}
            elseif #opt == 4 then
                stroke_color = {opt[1]/255, opt[2]/255, opt[3]/255, opt[4]/255}
            end
        elseif g.type == "fontcolor" then
            if type(opt) == "string" then
                -- TODO: have color names like "red" in love2d
            elseif #opt == 3 then
                font_color = {opt[1]/255, opt[2]/255, opt[3]/255}
            elseif #opt == 4 then
                font_color = {opt[1]/255, opt[2]/255, opt[3]/255, opt[4]/255}
            end
        elseif g.type == "nofill" then
            is_fill_on = false
        elseif g.type == "nostroke" then
            is_stroke_on = false
        elseif g.type == "strokewidth" then
            stroke_width = tonumber(opt)
            love.graphics.setLineWidth( stroke_width )
        elseif g.type == "fontsize" then
            opt_font_size = tonumber(opt)
            if font_cache[opt_font_size] == nil then
                print("created new font")
                font_cache[opt_font_size] = love.graphics.newFont("Inconsolata-Regular.ttf", opt_font_size)
            else
                print("using cached font")
            end
            font = font_cache[opt_font_size]
            love.graphics.setFont(font)
        elseif g.type == "push" then
            love.graphics.push()
        elseif g.type == "pop" then
            love.graphics.pop()
        elseif g.type == "translate" then
            love.graphics.translate(tonumber(opt.x), tonumber(opt.y))
        elseif g.type == "rotate" then
            love.graphics.rotate(tonumber(opt))
        elseif g.type == "scale" then
            love.graphics.scale(tonumber(opt.x), tonumber(opt.y))
        elseif g.type == "transform" then
            if #opt == 9 then
                local transform = convertFromMatrixTermsToTransform(
                    tonumber(opt[1]), tonumber(opt[2]), tonumber(opt[3]),
                    tonumber(opt[4]), tonumber(opt[5]), tonumber(opt[6]),
                    tonumber(opt[7]), tonumber(opt[8]), tonumber(opt[9])
                )
                love.graphics.replaceTransform(transform)
            end
        elseif g.type == "image" then
            local image = nil
            if image_cache[opt.bitmap_image_base64] == nil then
                decoded = love.data.decode( 'data', 'base64', opt.bitmap_image_base64 )
                imageData = love.image.newImageData( decoded )
                image = love.graphics.newImage( imageData )
                image_cache[opt.bitmap_image_base64] = image
            else
                image = image_cache[opt.bitmap_image_base64]
            end
            r, g, b, a = love.graphics.getColor() -- save current color
            love.graphics.setColor(1, 1, 1, 1)
            sx = tonumber(opt.w) / image:getWidth()
            sy = tonumber(opt.h) / image:getHeight()
            love.graphics.draw(image, tonumber(opt.x), tonumber(opt.y), 0, sx, sy)
            love.graphics.setColor(r, g, b, a) -- reset back to saved color
        end
    end
end

function love.update()
    if is_first_update == false then
        room.listen(true) -- blocking listen
    else
        is_first_update = false
    end
end
