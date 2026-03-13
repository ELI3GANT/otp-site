import re

with open('index.html', 'r') as f:
    html = f.read()

# Make the hero text load faster
html = html.replace("delay: 0.5\n        });", "delay: 0.1\n        });")
html = html.replace("delay: 1.2\n        });", "delay: 0.5\n        });")
html = html.replace("delay: 1.8\n        });", "delay: 0.7\n        });")

# Make the intersection observer trigger instantly
html = html.replace("{ threshold: 0.1 }", "{ rootMargin: '0px 0px 200px 0px', threshold: 0 }")

with open('index.html', 'w') as f:
    f.write(html)
print("Updated hero animation and observer speed")
