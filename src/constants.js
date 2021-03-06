export const DEVICE_TYPE_NAMES = {
    "01": "Pella Door/Window",
    "03": "Pella Garage Door",
    "0D": "Pella Door Lock",
    "13": "Pella Blind"
};

export const DEVICE_TYPES = {
    DOOR_OR_WINDOW: "01",
    GARAGE_DOOR: "03",
    DOOR_LOCK: "0D",
    BLIND: "13"
};

export const GARAGE_DOOR_STATE = {
    LOCKED: new Set(["00", "04"]),
    UNLOCKED: new Set(["01", "02", "05", "06"])
};

export const DOOR_WINDOW_STATE = {
    CLOSED: new Set(["00", "02", "04", "06"]), //00 - closed, 02 - connected/re-connected
    OPEN: new Set(["01", "05"]) //01 - open
};

export const COMMANDS = {
    BATTERY_STATUS: "?POINTBATTERYGET-",
    BRIDGE_INFO: "?BRIDGEINFO",
    DEVICE_COUNT: "?POINTCOUNT",
    DEVICE_ID: "?POINTID-",
    DEVICE_INFO: "?POINTDEVICE-",
    DEVICE_STATUS: "?POINTSTATUS-",
    SET_DEVICE_STATUS: "?POINTSET-"
};
