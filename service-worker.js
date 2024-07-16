/*
    Possible Colors:
        "grey"
        "blue"
        "red"
        "yellow"
        "green"
        "pink"
        "purple"
        "cyan"
        "orange"
*/

let groups = [
  {
    title: "PROD",
    color: "red",
    patterns: [/:\/\/(?:\w*\.|)bibleproject\.com\//],
  },
  {
    title: "DEV",
    color: "orange",
    patterns: [/:\/\/(?:\w*\.|)bpwebdev\.com\//],
  },
  {
    title: "STAGE",
    color: "yellow",
    patterns: [/:\/\/(?:\w*\.|)bpwebstage\.com\//],
  },
  {
    title: "LOCAL",
    color: "green",
    patterns: [
      /:\/\/(?:\w*\.|)tbp\.test\//,
      /:\/\/(?:\w*\.|)bpweblocal\.com\//,
      /:\/\/localhost:3000\//,
    ],
  },
  {
    title: "JIRA",
    color: "blue",
    patterns: [/:\/\/bibleproject\.atlassian\.net\//],
  },
  {
    title: "GITHUB",
    color: "grey",
    patterns: [/:\/\/(?:\w*\.|)github\.com\//],
  },
];

let groupIds = {};

// return all group ids which belong to our group categories
let getActiveGroups = () => {
  let activeGroupIds = [];

  for (const i in groupIds) {
    activeGroupIds.push(groupIds[i]);
  }

  return activeGroupIds;
};

// return a group key by matching url to patterns
let getGroupKeyFromURL = (url) => {
  let groupKey = null;

  for (const i in groups) {
    for (const k in groups[i].patterns) {
      const pattern = groups[i].patterns[k];

      if (url.match(pattern)) {
        groupKey = i;
      }
    }
  }

  return groupKey;
};

// disband multiple tab groups
async function ungroupTabsInTabGroups(tabGroups) {
  for (const i in tabGroups) {
    await ungroupTabsInTabGroup(tabGroups[i]);
  }
}

// disband a tab group
async function ungroupTabsInTabGroup(tabGroup) {
  console.log("Disbanding..", tabGroup);

  await chrome.tabs.query(
    {
      groupId: tabGroup.id,
    },
    (tabs) => {
      console.log("Disbanding 2..", tabGroup, tabs);

      let tabIds = [];

      for (const i in tabs) {
        const tab = tabs[i];

        tabIds.push(tab.id);
      }

      console.log("Ungrouping tabs: ", tabIds);

      chrome.tabs.ungroup(tabIds);
    }
  );
}

// query existing groups on startup to see if our groups already exist
// this is probably only relevant for development
async function queryExistingGroups() {
  console.log("Checking if our groups already exist ..");
  console.log("Here's our initial groups: ", groups);

  for (const i in groups) {
    const group = groups[i];

    console.log(`Looking for group: ${group.title} with color: ${group.color}`);
    await chrome.tabGroups.query(
      {
        title: group.title,
        color: group.color,
      },
      function processTabGroups(tabGroups) {
        if (tabGroups.length == 0) {
          return;
        }

        console.log("Found groups!", tabGroups);

        for (const k in tabGroups) {
          const tabGroup = tabGroups[k];

          console.log("Found group!", i, group.title, tabGroup.id);

          if (k == 0) {
            groupIds[i] = tabGroup.id;

            console.log("Using this group", [
              tabGroup.id,
              groups[i].title,
              groupIds,
            ]);
          } else {
            console.log("Disbanding group: ", tabGroup);

            ungroupTabsInTabGroup(tabGroup);
          }
        }

        console.log("Here's our groups: ", groups);
      }
    );
  }
}

// query all existing tabs on startup to see if they belong in a group
// this is probably only relevant for development
async function queryExistingTabs() {
  await chrome.tabs.query({}, (tabs) => {
    console.log("Found existing tabs!", tabs);

    for (const i in tabs) {
      const tab = tabs[i];

      processTab(tab);
    }
  });
}

// check if tab belongs in one of our controlled tab groups
async function processTab(tab) {
  const groupKey = getGroupKeyFromURL(tab.url);

  if (!groupKey) {
    // if tab no longer matches an active group, ungroup it
    if (getActiveGroups().includes(tab.groupId)) {
      chrome.tabs.ungroup(tab.id);
    }
    return;
  }

  let options = {
    tabIds: tab.id,
    groupId: groupIds[groupKey],
  };

  console.log("Processing tab: ", tab.title);
  console.log("Tab belongs in group: ", groupIds[groupKey], groups[groupKey]);

  const inWrongGroup = (tab.groupId !== groupIds[groupKey] &&
    getActiveGroups().includes(tab.groupId));

  // if tab belongs in a group, but isnt in one
  // if tab belongs in a group, but is in the wrong one AND the wrong group is one we monitor
  if (
    tab.groupId == -1 ||
    inWrongGroup
  ) {
    console.log(
      "Adding tab to group",
      groupIds[groupKey],
      groups[groupKey],
      tab
    );
    // add tab to group
    await chrome.tabs.group(options, (groupId) => {
      console.log("Tab added to group: ", groupId);

      if (inWrongGroup) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'alert', 
          text: 'Warning: You have navigated to a new environment.',
        });
      }

      // if group was freshly created..
      if (groupIds[groupKey] != groupId) {
        groupIds[groupKey] = groupId;

        console.log(
          "Tab group is brand new: ",
          groupId,
          "Assigning it to: ",
          groups[groupKey].title
        );

        // update the group options with our custom title and color
        chrome.tabGroups.update(groupId, {
          title: groups[groupKey].title,
          color: groups[groupKey].color,
        });
      }
    });

  } else {
    console.log("Didnt add tab because:");
    if (tab.groupId !== -1) {
      console.log("Not -1");
    }
    if (tab.groupId == groupIds[groupKey]) {
      console.log("Tab is already in group", tab.groupId, groupIds[groupKey]);
    }
    if (!getActiveGroups().includes(tab.groupId)) {
      console.log("Activegroups does not include ", tab.groupId);
    }
  }
}

// functions to run only when plugin is initially added/loaded/launched
async function pluginStartup() {
  console.log("Plugin startup!");

  groupIds = {};
  for (const i in groups) {
    groupIds[i] = null;
  }

  await queryExistingGroups();
  console.log("Done! Querying tabs..");
  await queryExistingTabs();
}

// INIT
pluginStartup();

// Listen for closed tab groups
chrome.tabGroups.onRemoved.addListener((tabGroup) => {
  console.log("tabGroups.onRemoved", tabGroup);

  for (const i in groups) {
    if (groupIds[i] == tabGroup.id) {
      groupIds[i] = null;

      console.log("Tab group was closed: ", groups[i].title);
    }
  }
});

// Listen for moved tabs
chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
  console.log("TAB MOVED!", tabId, moveInfo);
});

// Listen for updated tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log("TAB UPDATED", {
    tabId: tab.id,
    changeInfo: changeInfo,
    tab: tab,
  });

  if (changeInfo.status && changeInfo.status == "complete") {
    processTab(tab);
  }
});
