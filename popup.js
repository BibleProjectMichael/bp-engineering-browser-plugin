document.addEventListener('DOMContentLoaded', function() {
  var buttons = document.querySelectorAll('button');

  buttons.forEach(function(button) {
    button.addEventListener('click', function() {
      var currentUrl;
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        currentUrl = tabs[0].url;

        var newUrl;
        switch (button.id) {
          case 'examplecom':
            newUrl = currentUrl.replace(/^(https?:\/\/)([^\/]+)(.*)$/, 'https://bibleproject.com$3');
            break;
          case 'examplestage':
            newUrl = currentUrl.replace(/^(https?:\/\/)([^\/]+)(.*)$/, 'https://bpwebstage.com$3');
            break;
          case 'exampledev':
            newUrl = currentUrl.replace(/^(https?:\/\/)([^\/]+)(.*)$/, 'https://bpwebdev.com$3');
            break;
          default:
            return;
        }

        chrome.tabs.update(tabs[0].id, {url: newUrl});
      });
    });
  });
});
