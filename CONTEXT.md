# ssreel

A mobile-first PWA that presents curated news as full-screen, vertically swipeable
cards — the reading posture of short-video apps applied to a news digest. It
collects and publishes its own articles at build time, and every reader's history
stays on their device.

## Language

### Reading

**Card**:
One article rendered full-screen: image, headline, excerpt. The unit of swiping.
_Avoid_: Slide, page, screen, post, reel

**Caught up**:
The state where a reader has no unread articles left. A normal and expected
resting state, not an error — articles only arrive four times a day.
_Avoid_: Empty state, no results, end of feed

**Reel**:
The vertical sequence of cards a reader swipes through. Holds only what that
reader has not read yet.
_Avoid_: Feed, stream, timeline, queue

**List**:
The browsable index of articles, read and unread alike, as an alternative to
swiping. Selecting an entry moves the reel or the reading pane to that article.
_Avoid_: Archive, index, feed view, inbox

**Settings**:
One reader's own preferences on one device — which sections and sources appear,
reading options, storage. There is no privileged or global administration.
_Avoid_: Admin, dashboard, preferences, config

**Expand**:
Opening a card to read the article's body in place, without leaving the app.
_Avoid_: Detail view, full view, drill down

**Read**:
An article the reader has dwelt on long enough to count as consumed. Read
articles leave the reel but remain on the device.
_Avoid_: Seen, viewed, consumed, done

**Dwell**:
How long a card stays the active card. Crossing a short threshold is what marks
an article read; a fast flick past does not.
_Avoid_: View time, watch time, linger

**Hide**:
Dismissing a single article so it never returns to the reel, without having read
it. The deliberate counterpart to dwell, which alone would let flicked-past
articles reappear.
_Avoid_: Dislike, block, skip, not interested

**Mute**:
Excluding a whole section or source from what a reader sees. Affects display only;
muted content is still downloaded and stored, so unmuting is instant and reveals
full history. Applies to categories, never to a single article — that is Hide.
_Avoid_: Block, unsubscribe, filter, disable

### Content

**Article**:
A single news story: headline, excerpt, image, source, author and publish time.
The unit a reader consumes on one card.
_Avoid_: Item, post, story, entry, news

**Excerpt**:
The plain-text opening of an article's body, capped at ~400 characters. What a
card shows.
_Avoid_: Summary, description, snippet, teaser

**Body**:
The full plain-text article content recovered by extraction, capped at a few
thousand characters. Published in the feed for e-ink readers; not shown on cards.
_Avoid_: Content, full text, article text

**Source**:
The outlet an article came from, e.g. Prothom Alo, BBC Bangla.
_Avoid_: Publisher, feed, channel, site

**Section**:
The editorial category an article is filed under: Local, International,
Entertainment, Tech or Sports.
_Avoid_: Category, topic, tag, genre

**Weight**:
How much authority a source carries. Summed across every outlet covering the same
story to produce that story's importance, so one major outlet's exclusive can
outrank several small ones echoing each other.
_Avoid_: Rank, priority, trust, score

### Pipeline

**Collector**:
The build-time job that fetches source feeds, extracts article bodies, dedupes
and classifies. Runs on CI, never in the browser.
_Avoid_: Scraper, crawler, backend, digest

**Run**:
One collection cycle, four per day at 07:50/13:50/19:50/00:50 Bangladesh time.
Articles arrive grouped by run, not as a continuous stream.
_Avoid_: Edition, batch, issue, update

**Extraction**:
Recovering an article's readable body from the publisher's HTML page, since feeds
rarely carry usable content themselves.
_Avoid_: Scraping, parsing, readability

**Feed**:
The RSS document ssreel publishes for outside subscribers, one item per article,
carrying the full body for e-ink readers. Never means a source outlet's own feed.
_Avoid_: RSS, syndication, channel

**Index**:
The small published list of runs currently available, which a device reads to work
out what it is missing.
_Avoid_: Manifest, catalogue, directory

**Window**:
How far back published runs are kept before pruning, images included. A publishing
policy for the collector only — see Retention for the separate, longer, on-device
policy.
_Avoid_: Retention, history, archive depth

**Retention**:
How long a device keeps a synced article, and its cached image, before purging it
from local storage. Evicted uniformly by publish time regardless of read state,
longer than the Window and tracked independently of it — once an article ages out
here it cannot be re-synced, since the collector no longer publishes it either.
_Avoid_: Window, cache duration, history depth

**Sync**:
A device reconciling itself against the index and downloading the runs it lacks.
_Avoid_: Refresh, update, pull, fetch
