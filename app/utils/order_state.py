VALID_TRANSITIONS = {
    "pending": {"accepted", "cancelled"},
    "accepted": {"preparing", "cancelled"},
    "preparing": {"ready", "cancelled"},
    "ready": {"completed"},
    "completed": set(),
    "cancelled": set(),
}

