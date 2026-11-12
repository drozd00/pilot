# Study pilot

Run a moderated comparison of two interfaces for the same service-request form. Interface A uses
native controls and Reka UI. Interface B uses custom controls.

## Start the pilot

Keep `pilot` and `analyzer` next to each other, or set `ANALYZER_DIR` to the analyzer checkout.
From `pilot/`, run:

```sh
if [ ! -f .env ]; then cp .env.example .env; fi
docker compose up --build -d
```

Open [localhost:3000](http://localhost:3000). Compose starts the app, datastore, and PostgreSQL.
Visit `/test/varianta-a` or `/test/varianta-b` to try the controls without recording a session.

The default `STUDY_DATASET_KIND=preflight` keeps test sessions separate. For participant collection,
set it to `pilot` in `.env`, then run `docker compose up -d --force-recreate datastore` and start a
new session. PostgreSQL data stays in a named volume across ordinary restarts and shutdowns.

## Run the analysis

```sh
mkdir -p artifacts
docker compose run --rm analyzer extract --study service-request --protocol pilot-v1 --kind preflight --out /artifacts/dataset.json
docker compose run --rm analyzer analyze --input /artifacts/dataset.json --out /artifacts/analysis
docker compose run --rm analyzer report --input /artifacts/analysis
```

Use `/artifacts` in analysis commands to write results into `pilot/artifacts/`.
`report --publication-out /publication` writes to the sibling `paper/generated/` directory by
default. Set `PAPER_GENERATED_DIR` to choose a different output directory. For older saved results,
add `--report-adapter service-request` to select the current renderer.
