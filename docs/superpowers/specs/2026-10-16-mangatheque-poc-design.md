# Mangathèque : POC de plan de rangement

## Intention

Hugo a ~1500 mangas dans 4 bibliothèques IKEA Billy (80 x 28 x 202 cm). Il veut les ranger proprement par public visé, ce qui est ingérable de tête à cette échelle. L'appli calcule où mettre chaque tome et à quelle hauteur placer chaque planche, puis affiche le résultat comme si on était devant les étagères. C'est un plan à suivre pendant le rangement, pas un outil du quotidien. Tout tourne en local, sans compte ni serveur.

Ce document couvre le POC : un échantillon de 234 tomes, le temps qu'Hugo fasse le ménage dans sa collection Manga Collec.

## Matériel

- 4 Billy de 80 cm de large et 202 cm de haut, posées côte à côte.
- Chaque Billy a 5 planches dont 1 fixe (donc 4 mobiles), plus 1 planche en rab : 6 planches max, soit 7 compartiments max.
- Double rangée possible : une marche imprimée en 3D au fond du compartiment surélève la rangée arrière, dont on voit le haut au-dessus de la rangée avant.

Les mesures intérieures ne sont publiées nulle part. Valeurs par défaut estimées, toutes modifiables dans l'appli (choix du builder, à faire mesurer par Hugo) :

| Réglage                                               | Défaut |
| ----------------------------------------------------- | ------ |
| Largeur intérieure                                    | 76 cm  |
| Profondeur intérieure                                 | 26 cm  |
| Hauteur intérieure                                    | 190 cm |
| Épaisseur d'une planche                               | 1,6 cm |
| Hauteur du dessous de la planche fixe, depuis le fond | 74 cm  |
| Pas des trous de taquets                              | 3,2 cm |
| Hauteur de la marche                                  | 6 cm   |
| Marge au-dessus du plus grand tome                    | 1,5 cm |
| Marge de largeur par rangée                           | 1 cm   |

## Règles de rangement (décidées par Hugo)

1. Groupes par public visé, puis par ordre alphabétique des séries dans chaque groupe.
2. Les séries d'un même univers (GTO, Berserk, King's Game…) restent côte à côte, en un bloc.
3. Une série n'est jamais coupée entre deux planches. Si elle est trop longue pour une rangée, elle continue dans la rangée arrière de la même planche.
4. Ordre continu : avant d'une planche, puis arrière, puis planche suivante.
5. Pas de place réservée pour les tomes à venir.
6. Priorité 1, "tout voir" : le moins de compartiments en double rangée possible.
7. Priorité 2, "faire joli" : des planches à la même hauteur d'une Billy à l'autre. En cas de conflit, la priorité 1 gagne.

## Règles complétées par le builder (présentées à Hugo, non contestées)

1. Ordre des groupes : Shōnen, Seinen, Shōjo, Josei, Kodomo, puis "Sans public".
2. Un univers prend le public le plus représenté parmi ses séries, pondéré par le nombre de tomes. GTO Shonan 14 days (sans public) suit donc GTO en Shōnen.
3. Sens de lecture : Billy de gauche à droite, compartiments de haut en bas.
4. Une série plus longue que l'avant et l'arrière réunis continue sur le compartiment suivant.
5. Les planches se posent sur les trous de taquets : les hauteurs sont arrondies au pas des trous.
6. Double rangée impossible si la largeur du tome le plus large devant plus celle du tome le plus large derrière dépasse la profondeur intérieure.
7. Une série qui tient sur une rangée n'est jamais coupée entre l'avant et l'arrière.
8. Tri alphabétique à la française, sans tenir compte de la casse ni des accents, sans retirer les articles ("L'Atelier des Sorciers" est à L).
9. Dans une série, les éditions dans l'ordre de Manga Collec puis les tomes par numéro.
10. Si tout ne rentre pas, l'appli place ce qu'elle peut dans l'ordre et liste le reste.

## Données

### Collection : Manga Collec

La page publique `https://www.mangacollec.com/user/kocal/collection` embarque dans son HTML (`globalThis.APP$SERVERDATA.DATA_STORE`) les séries, éditions et tomes possédés, avec ISBN et ASIN. Les noms des thèmes viennent de `GET https://api.mangacollec.com/v2/kinds`, avec le jeton d'application anonyme présent dans la même page (`SESSION_TOKEN.access_token`).

Le public visé est le thème de la série qui vaut Shōnen, Seinen, Shōjo, Josei ou Kodomo. 117 des 119 séries en ont exactement un.

La collection actuelle n'est pas à jour (tomes qu'Hugo n'a plus, tomes manquants). Hugo va la nettoyer. Le script d'import doit pouvoir être relancé à tout moment.

### Dimensions : Amazon

Manga Collec donne l'ASIN de chaque tome. La page `https://www.amazon.fr/dp/<ASIN>` affiche "Dimensions : 11.5 x 1.9 x 18 cm". Le plus petit nombre est l'épaisseur, le plus grand la hauteur, celui du milieu la largeur (donc la profondeur occupée sur la planche).

Contraintes :

1. Chargement lent (~3 s entre deux pages) et une seule fois : résultats gardés dans un fichier cache, les ASIN déjà connus ne sont pas rechargés.
2. Arrêt propre si Amazon renvoie une page captcha.
3. Si un tome n'a pas d'ASIN, on le déduit de l'ISBN-13 (ISBN-10 d'un livre = son ASIN).
4. Un tome sans dimension reçoit une estimation (11,5 x 1,8 x 18 cm, épaisseur 2,9 cm si l'édition contient "double"), signalée comme estimée dans l'appli.

### Univers

Manga Collec ne connaît pas les univers. Une liste écrite à la main, pré-remplie depuis les titres de la collection, qu'Hugo corrige : GTO, Berserk, Gambling School, Kamen Teacher, King's Game, My Hero Academia. L'ordre des séries dans un univers est celui de la liste.

### Échantillon

One Piece (74), Kingdom (69), Monster Intégral Deluxe (9), GTO : Great Teacher Onizuka édition double (13), Young GTO édition double (15), GTO Paradise Lost (20), Shonan Seven - GTO Stories (17), GTO Shonan 14 days (9), Dreamin' Sun (8). Total 234 tomes.

L'appli permet de basculer entre l'échantillon et la collection complète (dimensions estimées pour les tomes non chargés).

## Affichage

Validé par Hugo sur maquette : vue réaliste. Les 4 Billy côte à côte, de face, à l'échelle. La rangée arrière est plus sombre et dépasse au-dessus de la rangée avant, posée sur la marche. Couleur = public visé, nuance = série. Survoler un tome affiche série, numéro et dimensions.

Ajouts du builder :

1. Résumé chiffré : tomes placés, compartiments en double rangée, planches utilisées, tomes non placés.
2. Plan texte, compartiment par compartiment, à suivre pendant le rangement : "Billy 1, compartiment 2 (25,6 cm) : avant One Piece 1 à 40, arrière One Piece 41 à 74".
3. Panneau de réglages (mesures du tableau ci-dessus), gardé dans le navigateur, recalcul immédiat.

## Pile technique

Vue 3 avec TypeScript sur le projet Vite+ existant (`vp dev`, `vp test`, `vp check`). Scripts d'import en TypeScript exécutés par Node 24. Pas de backend.

## Hors POC

- Le ménage de la collection Manga Collec (Hugo).
- Le déplacement manuel d'une série dans l'appli.
- L'impression 3D de la marche : l'appli suppose une hauteur de marche unique.

## Décisions prises pendant le POC

1. Placement : on minimise d'abord le nombre de compartiments en double rangée, puis le nombre de tomes dans les rangées arrière, puis le nombre de compartiments.
2. Une série trop longue pour deux rangées est coupée en morceaux d'un compartiment. Si la double rangée est impossible (tomes trop profonds, marche trop haute), elle est coupée en rangées simples.
3. Hauteurs : la place libre d'une zone va au compartiment le plus bas en besoin, jusqu'à égaliser. Le reste sous le pas des trous va au compartiment du haut.
4. Un tome sans dimension prend la moyenne des tomes connus de son édition, sinon 11,5 x 1,8 x 18 cm (2,9 cm d'épaisseur pour une édition double). Il est hachuré dans l'appli.
5. Éditions d'une série : l'édition principale d'abord, puis les autres par titre.
6. Les coffrets sont ignorés : la page publique de Manga Collec ne détaille pas leur contenu.
7. Les valeurs négatives sont refusées dans les réglages, et la planche fixe est ramenée à l'intérieur de la Billy.
8. Les couvertures viennent de Manga Collec. Elles s'affichent dans le plan à suivre (couverture du premier tome de chaque plage) et au survol d'un tome.
9. L'appli s'ouvre sur la collection complète. `?collection=echantillon` ouvre l'échantillon.
10. Amazon affiche un captcha après ~110 pages. `node scripts/fetch-dimensions.ts --one-per-edition` charge un seul tome par édition sans dimension.

## Reste à faire (relevé par la revue de code)

- Borner les réglages à des plages raisonnables : un pas de trous minuscule peut saturer la mémoire, et le réglage reste enregistré.
- Garder une trace des pages Amazon sans dimensions pour ne pas les recharger, et arrêter le script sur une réponse HTTP en erreur.
- Supprimer `src/domain/smoke.test.ts`.
- Remettre la tuile "tomes non placés" prévue par la spec.
