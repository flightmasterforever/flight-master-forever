-- Flight Master Dump
-- Each time you open a flight master's map, this records what the game client itself reports:
-- every flight point on that map, whether you know it, its price, and the exact hops the game
-- will fly to reach it (GetNumRoutes / TaxiGetDestX / TaxiGetDestY). Nothing is guessed.
-- Data is saved per character (known flight paths differ) in WTF\...\SavedVariables\FlightMasterDump.lua
-- when you /reload or log out.

local ADDON = "FlightMasterDump"
local f = CreateFrame("Frame")

local function round(v) return math.floor(v * 100000 + 0.5) / 100000 end

local function charKey()
  local name = UnitName("player") or "?"
  local realm = GetRealmName() or "?"
  return name .. "-" .. realm
end

-- find the flight point at a map position (hops are reported as positions)
local function nodeAt(nodes, x, y)
  local best, bestD
  for i, n in pairs(nodes) do
    local d = (n.x - x) ^ 2 + (n.y - y) ^ 2
    if not bestD or d < bestD then best, bestD = i, d end
  end
  if best and bestD < 0.000004 then return nodes[best].name end -- within 0.002 of map width
  return string.format("?(%.4f,%.4f)", x, y)
end

local function capture()
  local count = NumTaxiNodes and NumTaxiNodes() or 0
  if count == 0 then return end

  local nodes, current = {}, nil
  for i = 1, count do
    local x, y = TaxiNodePosition(i)
    local t = TaxiNodeGetType(i)
    nodes[i] = { name = TaxiNodeName(i), type = t, x = round(x or 0), y = round(y or 0) }
    if t == "CURRENT" then current = nodes[i].name end
  end
  if not current then return end

  local dests = {}
  for i = 1, count do
    local n = nodes[i]
    local entry = { type = n.type, x = n.x, y = n.y }
    if n.type == "REACHABLE" then
      entry.cost = TaxiNodeCost(i)
      local hops = GetNumRoutes(i) or 0
      entry.hops = {}
      for h = 1, hops do
        local hx, hy = TaxiGetDestX(i, h), TaxiGetDestY(i, h)
        entry.hops[h] = nodeAt(nodes, hx, hy)
      end
    end
    dests[n.name] = entry
  end

  FlightMasterDumpDB = FlightMasterDumpDB or {}
  local db = FlightMasterDumpDB
  db.format = 1
  local version, build = GetBuildInfo()
  db.client = (version or "?") .. "." .. (build or "?")
  db.chars = db.chars or {}
  local key = charKey()
  local c = db.chars[key] or {}
  db.chars[key] = c
  c.faction = UnitFactionGroup("player")
  c.class = select(2, UnitClass("player"))
  c.level = UnitLevel("player")
  c.masters = c.masters or {}
  c.masters[current] = { time = time(), mapID = C_Map and C_Map.GetBestMapForUnit and C_Map.GetBestMapForUnit("player") or nil, dests = dests }

  local known = 0
  for _, n in pairs(nodes) do if n.type == "REACHABLE" or n.type == "CURRENT" then known = known + 1 end end
  local masters = 0
  for _ in pairs(c.masters) do masters = masters + 1 end
  print(string.format("|cffffd100Flight Master Dump:|r saved routes from %s (%d known flight points). %d flight master(s) recorded for %s. /reload to write the file.", current, known, masters, key))
end

f:RegisterEvent("TAXIMAP_OPENED")
f:SetScript("OnEvent", function(_, event)
  if event == "TAXIMAP_OPENED" then
    -- the map's routes are ready a moment after it opens
    C_Timer.After(0.2, capture)
  end
end)

SLASH_FLIGHTMASTERDUMP1 = "/fmdump"
SlashCmdList.FLIGHTMASTERDUMP = function(msg)
  local db = FlightMasterDumpDB
  if msg == "clear" then FlightMasterDumpDB = nil print("|cffffd100Flight Master Dump:|r cleared.") return end
  if not db or not db.chars then print("|cffffd100Flight Master Dump:|r nothing recorded yet. Open a flight master's map.") return end
  for key, c in pairs(db.chars) do
    local list = {}
    for name in pairs(c.masters or {}) do list[#list + 1] = name end
    table.sort(list)
    print(string.format("|cffffd100%s|r (%s): %d flight master(s): %s", key, c.faction or "?", #list, table.concat(list, ", ")))
  end
end
