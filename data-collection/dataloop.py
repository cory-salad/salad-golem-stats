while True:
    try:
        print(f"[{datetime.now()}] Running ingest...")
        main()
        print("Done. Sleeping 4 hours...")
    except Exception as e:
        print("ERROR:", e)

    time.sleep(4 * 60 * 60)
