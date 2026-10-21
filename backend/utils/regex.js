// Helpers for turning what a person TYPED into a safe, literal search pattern.
//
// Without these, text like "KL/26(1)" or "+91..." was handed to MongoDB as a
// regular expression, so brackets and "+" either errored or matched the wrong
// thing (and "." matched any character).

// Returns the trimmed text, or "" if the value isn't plain text
// (for example when someone sends ?search[]=a or ?search[$ne]=a).
function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Puts a backslash in front of every character that has a special meaning in a pattern.
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Matches the text ANYWHERE in a field, ignoring upper/lower case (for search boxes).
// Returns null when there is nothing to search for.
function containsRegex(value) {
  const text = asText(value);
  return text ? new RegExp(escapeRegex(text), "i") : null;
}

// Matches the WHOLE field exactly, ignoring upper/lower case (for lookups like invoice number).
// Returns null when there is nothing to look up.
function exactRegex(value) {
  const text = asText(value);
  return text ? new RegExp("^" + escapeRegex(text) + "$", "i") : null;
}

module.exports = { asText, escapeRegex, containsRegex, exactRegex };