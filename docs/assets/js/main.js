function copyToClipboard(feed) {
    var copyText = document.getElementById("feed_url_" + feed);
    var btn = document.getElementById("copy_btn_" + feed);

    copyText.select();
    copyText.setSelectionRange(0, 99999);

    navigator.clipboard.writeText(copyText.value);

    if (btn) {
        var original = btn.textContent;
        btn.textContent = "✓ Kopiert";
        btn.classList.add("copied");
        setTimeout(function () {
            btn.textContent = original;
            btn.classList.remove("copied");
        }, 1500);
    }
}

function statusFor(feed) {
    if (feed.ignore) {
        return {
            cls: "status-obsolete",
            icon: "⏹",
            label: "Inaktiv (over et år)",
            tip: "Ingen nye episoder på over et år. Podkasten regnes som avsluttet.",
        };
    }
    if (!feed.enabled) {
        return {
            cls: "status-paused",
            icon: "⏸",
            label: "Pauset",
            tip: "Ingen nye episoder de siste 30 dagene.",
        };
    }
    return {
        cls: "status-active",
        icon: "▶",
        label: "Aktiv",
        tip: "Ny episode publisert de siste 30 dagene.",
    };
}

function relTime(dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr);
    if (isNaN(d)) return "";
    var diffMs = Date.now() - d.getTime();
    var rtf = new Intl.RelativeTimeFormat("no", { numeric: "auto" });
    var diffMin = Math.round(diffMs / 6e4);
    if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, "minute");
    var diffH = Math.round(diffMs / 36e5);
    if (Math.abs(diffH) < 48) return rtf.format(-diffH, "hour");
    var diffD = Math.round(diffH / 24);
    if (Math.abs(diffD) < 30) return rtf.format(-diffD, "day");
    var diffMo = Math.round(diffD / 30);
    if (Math.abs(diffMo) < 12) return rtf.format(-diffMo, "month");
    return rtf.format(-Math.round(diffMo / 12), "year");
}

function absDate(dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr);
    if (isNaN(d)) return "";
    return d.toLocaleString("no", { dateStyle: "medium", timeStyle: "short" });
}

function el(tag, opts) {
    var node = document.createElement(tag);
    if (!opts) return node;
    if (opts.cls) node.className = opts.cls;
    if (opts.id) node.id = opts.id;
    if (opts.text != null) node.textContent = opts.text;
    if (opts.title) node.title = opts.title;
    if (opts.attrs) {
        Object.keys(opts.attrs).forEach(function (k) {
            node.setAttribute(k, opts.attrs[k]);
        });
    }
    return node;
}

function buildPodcastRow(feed, feed_url, info_url) {
    var status = statusFor(feed);
    var name = feed.name || feed.title;
    var description = feed.description || "";

    var row = el("li", { cls: "podcast-row " + status.cls });
    row.dataset.name = name.toUpperCase();
    row.dataset.status = status.cls;

    // Artwork
    if (feed.image) {
        var img = el("img", {
            cls: "podcast-art",
            attrs: { src: feed.image, alt: "", loading: "lazy" },
        });
        row.appendChild(img);
    } else {
        row.appendChild(el("div", { cls: "podcast-art podcast-art-placeholder" }));
    }

    // Body
    var body = el("div", { cls: "podcast-body" });

    var head = el("div", { cls: "podcast-head" });
    var titleLink = el("a", {
        cls: "podcast-title",
        text: name,
        attrs: { href: info_url, target: "_blank", rel: "noopener" },
    });
    head.appendChild(titleLink);

    var statusWrap = el("span", { cls: "podcast-status", title: status.tip });
    statusWrap.appendChild(el("span", { cls: "status-dot", text: status.icon }));
    statusWrap.appendChild(el("span", { cls: "status-label", text: status.label }));
    head.appendChild(statusWrap);
    body.appendChild(head);

    if (description) {
        body.appendChild(el("p", { cls: "podcast-description", text: description }));
    }

    if (feed.last_episode && feed.last_episode.title) {
        var latest = el("p", { cls: "podcast-latest" });
        latest.appendChild(el("span", { cls: "latest-label", text: "Siste episode: " }));
        latest.appendChild(el("span", { cls: "latest-title", text: feed.last_episode.title }));
        if (feed.last_episode.date) {
            latest.appendChild(document.createTextNode(" "));
            latest.appendChild(el("time", {
                cls: "latest-date",
                text: relTime(feed.last_episode.date),
                title: absDate(feed.last_episode.date),
                attrs: { datetime: feed.last_episode.date },
            }));
        }
        body.appendChild(latest);
    }

    var copyRow = el("div", { cls: "podcast-copy" });
    var input = el("input", {
        id: "feed_url_" + feed.id,
        attrs: { type: "text", readonly: "", value: feed_url, "aria-label": "RSS-feed URL for " + name },
    });
    copyRow.appendChild(input);

    var btn = el("button", {
        cls: "copy-btn",
        id: "copy_btn_" + feed.id,
        text: "📋 Kopier",
        attrs: { type: "button" },
    });
    btn.addEventListener("click", function () { copyToClipboard(feed.id); });
    copyRow.appendChild(btn);

    body.appendChild(copyRow);
    row.appendChild(body);
    return row;
}

function listFeeds() {
    var base_url = "https://olen.github.io/nrk-pod-feeds/rss/";
    var info_base_url = "https://radio.nrk.no/podkast/";
    var list = document.getElementById("feeds_list");

    // Norwegian locale-aware sort so æ/ø/å land in the right place.
    var collator = new Intl.Collator("no", { sensitivity: "base", numeric: true });
    var visible = feeds
        .filter(function (f) { return !f.hidden; })
        .slice()
        .sort(function (a, b) {
            return collator.compare(a.name || a.title || a.id, b.name || b.title || b.id);
        });

    var frag = document.createDocumentFragment();
    visible.forEach(function (feed) {
        var feed_url = base_url + feed.id + ".xml";
        var info_url = info_base_url + feed.id;
        frag.appendChild(buildPodcastRow(feed, feed_url, info_url));
    });
    list.replaceChildren(frag);

    wireFilters();
    applyFilters();
}

function wireFilters() {
    document.getElementById("searchInput").addEventListener("input", applyFilters);
    document.querySelectorAll("#legend .legend-item").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var on = btn.getAttribute("aria-pressed") !== "false";
            btn.setAttribute("aria-pressed", on ? "false" : "true");
            applyFilters();
        });
    });
}

function applyFilters() {
    var query = (document.getElementById("searchInput").value || "").toUpperCase();
    var enabledStatuses = {};
    document.querySelectorAll("#legend .legend-item").forEach(function (btn) {
        enabledStatuses[btn.dataset.filter] = btn.getAttribute("aria-pressed") !== "false";
    });

    document.querySelectorAll("#feeds_list .podcast-row").forEach(function (row) {
        var matchesQuery = (row.dataset.name || "").indexOf(query) > -1;
        var matchesStatus = enabledStatuses[row.dataset.status] !== false;
        row.style.display = matchesQuery && matchesStatus ? "" : "none";
    });
}
