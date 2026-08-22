# About page copy

Draft one. Roughly 350 words. Sixth grade reading level, no em dashes.
Bracketed items need Joe to confirm before publishing.

---

## About FIVEMILE

### What this is

FIVEMILE tells you what is going on in Graysville, Cardiff, and Brookside right
now. The weather. The creek. When the council meets. What is happening this
weekend. That is the whole idea, and it is why the address is fivemile.now.

### Why it exists

All three towns have Facebook groups, and they are fine for talking. They are
not good for remembering. Somebody posts that the crossing is blocked and it is
gone by suppertime. There is no place to look up when the council meets, what
the creek did last March, or who used to run the store.

This site keeps things. Nothing here scrolls away.

### Why three towns

The same creek runs past all three. So does the same weather, the same
railroad, and a good many of the same families. If you live in one of these
towns you already know people in the other two.

### Who runs it

My name is Joe Graham and I live in Cardiff. My grandfather was mayor here for
years, and so was his father before him. There are Grahams buried in Brookside
and Grahams still living all over these hills. My uncle Emmit ran Tucker TV in
Graysville [confirm shop name and whether Emmit is the right spelling]. My
grandmother worked at Eagle's Supermarket [confirm].

I am doing this because nobody else was, and because I think a place ought to
have a record of itself.

### What we run

Photographs. Announcements. Events. Weather and creek conditions. Local
history. Things worth knowing about.

### What we do not run

Obituaries. Sports. Politics.

### Send us something

Photographs, announcements, and events are welcome from anybody in any of the
three towns. Write to fivemilec@gmail.com.

By sending us a photo you are giving us permission to publish it on this site
with your name, unless you tell us not to.

### If we get something wrong

Tell us and we will fix it. fivemilec@gmail.com.

**Footer line, every page, links to this section:**

> Built with AI help. A person approves everything before it publishes, and no
> image here is AI generated.

### How this site is made

I use AI tools to build and write FIVEMILE. Claude helps me write the code,
draft pages, and catch things I miss. I would rather say that plainly than have
somebody wonder about it, so here is what it does and does not mean.

**A person decides what runs.** Everything written in FIVEMILE's own voice is
written or edited by me before it goes up. Nothing publishes on its own.

**The news page is different, and you should know how.** Headlines there are
gathered automatically from other publications, sorted by a script, and linked
back to whoever reported them. I do not write those stories and I do not read
every one before it appears. The link always goes to the source.

**Nothing is written by a machine while you are reading it.** The weather and
creek numbers come from instruments. The notes beside them were written ahead
of time by a person and matched to the conditions by a simple rule. There is no
chatbot behind this page.

**No invented photographs, ever.** Nothing here is an AI-generated image and
nothing ever will be. Historical photographs are real, sourced, and credited.
Around here people can recognize their own grandparents in a picture, and a
fake one would be unforgivable.

**No invented quotes, people, or history.** When something is not known, the
site says it is not known.

**The mistakes are still mine.** Using a tool is not an excuse for getting
something wrong. Tell me and I will fix it and say that I fixed it.

### One more thing

FIVEMILE is not connected to the City of Graysville, the Town of Brookside, or
Jefferson County. It is not a government website. It is just a fellow from
Cardiff keeping track of things.

---

# Claude Code prompt

```
Create cardiff-about.html using the standard site shell (masthead,
announcement strip, footer, nav).

Use the About page copy exactly as written in fivemile-about-copy.md.
Do not rewrite it, do not condense it, do not add headings that are not
there. Any bracketed [confirm ...] note is an instruction to Joe, not
content: leave the surrounding sentence in place and drop the bracket
text only when Joe has confirmed it.

Layout: single column, max-width 680px, generous line height. This page
is read, not scanned. No cards, no infoboxes, no data widgets.

Section headings use the standard h2 style. The three town names appear
in the order Graysville, Cardiff, Brookside and must not be reordered.

Add the page to the footer nav on every page. Do not add it to the main
top nav, which stays for the working pages.

The email address renders from BRAND.email, not hardcoded.

Commit: "content: about page"
```
