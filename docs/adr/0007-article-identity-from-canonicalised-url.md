# Article identity is a hash of the canonicalised URL

An article's id is a truncated hash of its URL after canonicalisation: host
lowercased, fragment removed, and known tracking parameters (`utm_*`, `fbclid`,
`gclid`, `ref` and similar) stripped. Every other query parameter is preserved.

Identity has to be stable across runs, because the same article can appear in
consecutive collections and must remain one article with one read state. Hashing
the raw URL fails that when a feed appends a tracking parameter, producing a
visible duplicate in the reel and a second copy of the same image.

Stripping the entire query string would be worse. Some outlets serve genuinely
distinct articles from query-based URLs such as `?p=12345`, and collapsing those
would merge unrelated stories into a single id — silently losing news, with no
error to notice. Only parameters known to be tracking noise are removed.

Title-based identity was rejected because a corrected headline would fork one
article into two, and similar headlines from a single outlet would merge.

## Consequences

- The tracking-parameter list needs occasional maintenance as outlets adopt new
  ones. Failure mode is a duplicate article, which is visible and harmless.
- If a publisher changes an article's URL, it will be treated as a new article.
  Accepted; the alternative identity schemes fail more often.
- Ids are filename-safe and are used directly for stored image filenames.
- Existing dedup state keyed on raw links does not carry over to this scheme.
