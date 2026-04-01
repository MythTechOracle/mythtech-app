export const sourceRegistry = {
  gdelt: {
    name: "GDELT DOC",
    family: "gdelt",
    confidence: 0.65
  }
};

export const queryBaskets = {
  security: ["airspace restriction", "missile strike", "troop movement", "security incident"],
  diplomacy: ["foreign ministry statement", "technical talks", "ceasefire talks", "diplomatic summit"],
  infrastructure: ["port disruption", "rail disruption", "power outage", "pipeline disruption"],
  policy: ["sanctions guidance", "export control", "compliance update", "policy signal"],
  information: ["claim corrected", "official clarification", "retracted statement", "information correction"],
  cyber: ["cyber advisory", "credential stuffing", "malware alert", "network outage"]
};
