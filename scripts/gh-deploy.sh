cd ../gh-deploy

export PUBLIC_URL="https://leonardosnt.github.io/jar-string-editor/"

echo Building...

yarn build

rm -rf static # remove old assets
cp -rfv ../build/* ./

echo =========== Modified files ===========
git diff --name-only
echo ============================================

echo Commit changes [y/n] ?

read shouldCommit

if [ $shouldCommit == "y" ]; then
  git add .
  git commit -m "update"
  git push -u origin gh-pages
fi

read