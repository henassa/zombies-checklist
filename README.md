# zombies-checklist

Ma checklist pour les maps Zombies de Call of Duty, de World at War à Black Ops 7 : quêtes principales, armes miracle, secrets, reliques, etc.

Pas de framework. La progression est stockée dans le `localStorage` du navigateur. Les boutons Exporter / Importer servent à la transférer sur un autre appareil.

## Lancer en local

Ouvrir `index.html` dans un navigateur suffit, il n'y a rien à installer.

## Fichiers

- `data.js` : les jeux, les maps et les objectifs
- `tips.js` : les indices affichés à côté des objectifs (bouton ampoule)
- `app.js` : le rendu et la sauvegarde
- `src/input.css` : le thème Tailwind, compilé dans `tailwind.css`

## Ajouter ou corriger un objectif

Tout se passe dans `data.js`. Une map ressemble à ça :

```js
{ id: "origins", name: "Origins", std: true,
  quest: "Little Lost Girl", diff: "Difficile", time: "1 h 30 à 3 h",
  ee: ["Construire les 4 bâtons", ...],
  ww: ["Bâton de Feu (Kagutsuchi's Blood)", ...],
  secrets: ["Pelle en or", ...],
  obj: ["Ouvrir le Pack-a-Punch"] }
```

La liste complète des champs est en haut du fichier.

Une case cochée est enregistrée sous `id de la map | section | texte`. Si on change le texte d'un objectif, il se décoche, sauf si on ajoute l'ancien texte dans `ZOMBIES_RENAMES`, à la fin du fichier. Pareil quand un objectif passe d'une map à une autre : on l'ajoute dans `ZOMBIES_MOVES`.

Les maps rééditées ont une fiche par jeu, par exemple Nacht dans WaW, BO1 et BO3. Chaque fiche n'a que les secrets de sa version.

## Indices

`tips.js` associe un objectif à son indice, avec son texte exact :

```js
window.ZOMBIES_TIPS = {
  motd: { "Acid Gat Kit": "Trouve les 3 pièces et assemble-les à un établi…" }
};
```

Modifier un indice ne touche pas à la progression.

## CSS

`tailwind.css` est déjà compilé et versionné. Il faut le régénérer seulement si on ajoute des classes ou qu'on change le thème :

```bash
npm install
npm run build   # ou npm run dev pour recompiler à chaque modif
```

## Déploiement

GitHub Pages depuis la branche `main`, à la racine. Après une mise à jour, change le `?v=` des fichiers dans `index.html` pour que les navigateurs ne gardent pas l'ancienne version en cache.

## Sources

Les étapes et indices viennent en grande partie de [codzombiesguides.com](https://codzombiesguides.com), [codzombieguides.com](https://www.codzombieguides.com) et [cod-zombies.com](https://cod-zombies.com), résumés et reformulés.
