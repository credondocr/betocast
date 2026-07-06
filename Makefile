.PHONY: install dev stop clean

install:
	cd admin && npm install
	npm install

dev:
	@echo "🏁 Stopping previous instances..."
	@lsof -ti:3001 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5173 | xargs kill -9 2>/dev/null || true
	@sleep 1
	@echo "🚀 Starting BetoCast backend on http://localhost:3001"
	@nohup sh -c 'PORT=3001 npx tsx src/index.ts' > /tmp/betocast-backend.log 2>&1 &
	@sleep 3
	@echo "🎨 Starting admin on http://localhost:5173"
	@nohup sh -c 'cd admin && npx vite --host' > /tmp/betocast-admin.log 2>&1 &
	@sleep 3
	@echo ""
	@echo "════════════════════════════════════════"
	@echo "  🏁 BetoCast is running!"
	@echo ""
	@echo "  Admin:   http://localhost:5173"
	@echo "  Backend: http://localhost:3001"
	@echo "════════════════════════════════════════"
	@echo ""
	@tail -1 /tmp/betocast-backend.log 2>/dev/null
	@tail -3 /tmp/betocast-admin.log 2>/dev/null

stop:
	@lsof -ti:3001 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5173 | xargs kill -9 2>/dev/null || true
	@echo "✅ Stopped"

clean: stop
	rm -f data/betocast.db
	@echo "🧹 Cleaned"
