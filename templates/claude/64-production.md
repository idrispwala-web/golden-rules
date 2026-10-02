
## Production server
- Never stop, restart, recreate or upgrade a container; never run a distribution upgrade; never edit reverse-proxy, database or container configuration; never reboot — unless I explicitly ask in this session.
- Install system packages only when missing, only after I approve, and without upgrading anything already installed.
- Take a health snapshot before changing anything and compare afterwards. If a service's uptime resets or an endpoint stops answering, stop immediately and report.
