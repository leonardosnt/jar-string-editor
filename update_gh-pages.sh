git checkout master src/
git checkout master dist/

cp -f src/index.html index.html

sed -i 's/\.\.\/dist/\.\/dist/g' index.html

git rm -rf src/

echo Done!