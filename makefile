
.PHONY: publish remove install build

install:
	npm install

build: install
	npm run build

publish: build
	npm run build
	git tag v$(v)
	git checkout -b $(v) v$(v)
	git add .
	git commit -m "$(m)"
	git push origin $(v)
	git push --tag
	git checkout master
	git merge $(v)
	git push
	npm publish

remove:
	git checkout master
	git branch -d $(v)
	git tag -d v$(v)
