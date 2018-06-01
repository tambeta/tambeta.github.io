---
layout: post
title:  "Reproduce useful tab bar behavior from Tab Mix Plus on Firefox Quantum"
date:   2018-06-01
categories: hack
---

[Firefox Quantum](https://en.wikipedia.org/wiki/Quantum_(Mozilla)) takes a
great stride forward in terms of perceived latency and memory use, and truly
feels like a modern browser in 2018. Unfortunately there's a flip side:
dropped support for the massive library of legacy (non-WE) extensions. I took
some time to reproduce the most useful portions of my [Tab Mix
Plus](http://www.tabmixplus.org/) configuration:

* switch tab upon mouse wheel scroll on the tab bar
* close tab upon double click on a tab
* undo close tab upon middle click on the tab bar

Additionally, `userChrome.css` contains styles to hide the tab bar if only one
tab is open.

Create or update these files in the `chrome` subdirectory in your [Firefox
profile directory](http://kb.mozillazine.org/Profile_folder_-_Firefox):

#### userChrome.css

{% highlight css %}
.tabbrowser-arrowscrollbox > .arrowscrollbox-scrollbox {
  -moz-binding: url("bindings.xml#tabs-scroll") !important;
}

/* Hide tab bar if only one tab open  */

#tabbrowser-tabs, #tabbrowser-tabs arrowscrollbox {
    min-height: 0 !important;
}

#tabbrowser-tabs tab {
    height: var(--tab-min-height);
}

#tabbrowser-tabs tab:first-child:last-child {
    display: none !important;
}
{% endhighlight %}

### bindings.xml

{% highlight xml %}
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE bindings>
<bindings xmlns="http://www.mozilla.org/xbl">
    <binding id="tabs-scroll" extends="chrome://global/content/bindings/scrollbox.xml#scrollbox">
        <handlers>
            <handler event="wheel"><![CDATA[
                // Preserve original behaviour if meta (Windows) key is held

                if (event.metaKey) return;

                if (event.deltaY < 0) {
                    gBrowser.tabContainer.advanceSelectedTab(-1, true);
                }
                else {
                    gBrowser.tabContainer.advanceSelectedTab(1, true);
                }

                event.stopPropagation();
                event.preventDefault();
            ]]></handler>
            <handler event="dblclick"><![CDATA[
                gBrowser.removeCurrentTab();
            ]]></handler>
            <handler event="click"><![CDATA[
                if (!event.button || event.button != 1)
                    return;

                var xpc_window = window
                    .QueryInterface(Ci.nsIInterfaceRequestor)
                    .getInterface(Ci.nsIDOMWindow);
                var session_store = Cc['@mozilla.org/browser/sessionstore;1']
                    .getService(Ci.nsISessionStore);

                session_store.undoCloseTab(xpc_window, 0);
                event.stopPropagation();
                event.preventDefault();
          ]]></handler>
      </handlers>
  </binding>
</bindings>
{% endhighlight %}
