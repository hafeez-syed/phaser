/// <reference path="../_definitions.ts" />
/**
* Phaser - Tilemap
*
* This GameObject allows for the display of a tilemap within the game world. Tile maps consist of an image, tile data and a size.
* Internally it creates a TilemapLayer for each layer in the tilemap.
*/
var Phaser;
(function (Phaser) {
    var Tilemap = (function () {
        /**
        * Tilemap constructor
        * Create a new <code>Tilemap</code>.
        *
        * @param game {Phaser.Game} Current game instance.
        * @param key {string} Asset key for this map.
        * @param mapData {string} Data of this map. (a big 2d array, normally in csv)
        * @param format {number} Format of this map data, available: Tilemap.FORMAT_CSV or Tilemap.FORMAT_TILED_JSON.
        * @param resizeWorld {bool} Resize the world bound automatically based on this tilemap?
        * @param tileWidth {number} Width of tiles in this map.
        * @param tileHeight {number} Height of tiles in this map.
        */
        function Tilemap(game, key, mapData, format, resizeWorld, tileWidth, tileHeight) {
            if (typeof resizeWorld === "undefined") { resizeWorld = true; }
            if (typeof tileWidth === "undefined") { tileWidth = 0; }
            if (typeof tileHeight === "undefined") { tileHeight = 0; }
            /**
            * z order value of the object.
            */
            this.z = -1;
            /**
            * Render iteration counter
            */
            this.renderOrderID = 0;
            /**
            * Tilemap collision callback.
            * @type {function}
            */
            this.collisionCallback = null;
            this.game = game;
            this.type = Phaser.Types.TILEMAP;
            this.exists = true;
            this.active = true;
            this.visible = true;
            this.alive = true;
            this.z = -1;
            this.group = null;
            this.name = '';
            this.texture = new Phaser.Display.Texture(this);
            this.transform = new Phaser.Components.TransformManager(this);
            this.tiles = [];
            this.layers = [];
            this.mapFormat = format;
            switch(format) {
                case Tilemap.FORMAT_CSV:
                    this.parseCSV(game.cache.getText(mapData), key, tileWidth, tileHeight);
                    break;
                case Tilemap.FORMAT_TILED_JSON:
                    this.parseTiledJSON(game.cache.getText(mapData), key);
                    break;
            }
            if(this.currentLayer && resizeWorld) {
                this.game.world.setSize(this.currentLayer.widthInPixels, this.currentLayer.heightInPixels, true);
            }
        }
        Tilemap.FORMAT_CSV = 0;
        Tilemap.FORMAT_TILED_JSON = 1;
        Tilemap.prototype.parseCSV = /**
        * Parset csv map data and generate tiles.
        * @param data {string} CSV map data.
        * @param key {string} Asset key for tileset image.
        * @param tileWidth {number} Width of its tile.
        * @param tileHeight {number} Height of its tile.
        */
        function (data, key, tileWidth, tileHeight) {
            var layer = new Phaser.TilemapLayer(this, 0, key, Tilemap.FORMAT_CSV, 'TileLayerCSV' + this.layers.length.toString(), tileWidth, tileHeight);
            //  Trim any rogue whitespace from the data
            data = data.trim();
            var rows = data.split("\n");
            for(var i = 0; i < rows.length; i++) {
                var column = rows[i].split(",");
                if(column.length > 0) {
                    layer.addColumn(column);
                }
            }
            layer.updateBounds();
            var tileQuantity = layer.parseTileOffsets();
            this.currentLayer = layer;
            this.collisionLayer = layer;
            this.layers.push(layer);
            this.generateTiles(tileQuantity);
        };
        Tilemap.prototype.parseTiledJSON = /**
        * Parse JSON map data and generate tiles.
        * @param data {string} JSON map data.
        * @param key {string} Asset key for tileset image.
        */
        function (data, key) {
            //  Trim any rogue whitespace from the data
            data = data.trim();
            var json = JSON.parse(data);
            for(var i = 0; i < json.layers.length; i++) {
                var layer = new Phaser.TilemapLayer(this, i, key, Tilemap.FORMAT_TILED_JSON, json.layers[i].name, json.tilewidth, json.tileheight);
                //  Check it's a data layer
                if(!json.layers[i].data) {
                    continue;
                }
                layer.alpha = json.layers[i].opacity;
                layer.visible = json.layers[i].visible;
                layer.tileMargin = json.tilesets[0].margin;
                layer.tileSpacing = json.tilesets[0].spacing;
                var c = 0;
                var row;
                for(var t = 0; t < json.layers[i].data.length; t++) {
                    if(c == 0) {
                        row = [];
                    }
                    row.push(json.layers[i].data[t]);
                    c++;
                    if(c == json.layers[i].width) {
                        layer.addColumn(row);
                        c = 0;
                    }
                }
                layer.updateBounds();
                var tileQuantity = layer.parseTileOffsets();
                this.currentLayer = layer;
                this.collisionLayer = layer;
                this.layers.push(layer);
            }
            this.generateTiles(tileQuantity);
        };
        Tilemap.prototype.generateTiles = /**
        * Create tiles of given quantity.
        * @param qty {number} Quentity of tiles to be generated.
        */
        function (qty) {
            for(var i = 0; i < qty; i++) {
                this.tiles.push(new Phaser.Tile(this.game, this, i, this.currentLayer.tileWidth, this.currentLayer.tileHeight));
            }
        };
        Object.defineProperty(Tilemap.prototype, "widthInPixels", {
            get: function () {
                return this.currentLayer.widthInPixels;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Tilemap.prototype, "heightInPixels", {
            get: function () {
                return this.currentLayer.heightInPixels;
            },
            enumerable: true,
            configurable: true
        });
        Tilemap.prototype.setCollisionCallback = //  Tile Collision
        /**
        * Set callback to be called when this tilemap collides.
        * @param context {object} Callback will be called with this context.
        * @param callback {function} Callback function.
        */
        function (context, callback) {
            this.collisionCallbackContext = context;
            this.collisionCallback = callback;
        };
        Tilemap.prototype.setCollisionRange = /**
        * Set collision configs of tiles in a range index.
        * @param start {number} First index of tiles.
        * @param end {number} Last index of tiles.
        * @param collision {number} Bit field of flags. (see Tile.allowCollision)
        * @param resetCollisions {bool} Reset collision flags before set.
        * @param separateX {bool} Enable seprate at x-axis.
        * @param separateY {bool} Enable seprate at y-axis.
        */
        function (start, end, collision, resetCollisions, separateX, separateY) {
            if (typeof collision === "undefined") { collision = Phaser.Types.ANY; }
            if (typeof resetCollisions === "undefined") { resetCollisions = false; }
            if (typeof separateX === "undefined") { separateX = true; }
            if (typeof separateY === "undefined") { separateY = true; }
            for(var i = start; i < end; i++) {
                this.tiles[i].setCollision(collision, resetCollisions, separateX, separateY);
            }
        };
        Tilemap.prototype.setCollisionByIndex = /**
        * Set collision configs of tiles with given index.
        * @param values {number[]} Index array which contains all tile indexes. The tiles with those indexes will be setup with rest parameters.
        * @param collision {number} Bit field of flags. (see Tile.allowCollision)
        * @param resetCollisions {bool} Reset collision flags before set.
        * @param separateX {bool} Enable seprate at x-axis.
        * @param separateY {bool} Enable seprate at y-axis.
        */
        function (values, collision, resetCollisions, separateX, separateY) {
            if (typeof collision === "undefined") { collision = Phaser.Types.ANY; }
            if (typeof resetCollisions === "undefined") { resetCollisions = false; }
            if (typeof separateX === "undefined") { separateX = true; }
            if (typeof separateY === "undefined") { separateY = true; }
            for(var i = 0; i < values.length; i++) {
                this.tiles[values[i]].setCollision(collision, resetCollisions, separateX, separateY);
            }
        };
        Tilemap.prototype.getTileByIndex = //  Tile Management
        /**
        * Get the tile by its index.
        * @param value {number} Index of the tile you want to get.
        * @return {Tile} The tile with given index.
        */
        function (value) {
            if(this.tiles[value]) {
                return this.tiles[value];
            }
            return null;
        };
        Tilemap.prototype.getTile = /**
        * Get the tile located at specific position and layer.
        * @param x {number} X position of this tile located.
        * @param y {number} Y position of this tile located.
        * @param [layer] {number} layer of this tile located.
        * @return {Tile} The tile with specific properties.
        */
        function (x, y, layer) {
            if (typeof layer === "undefined") { layer = this.currentLayer.ID; }
            return this.tiles[this.layers[layer].getTileIndex(x, y)];
        };
        Tilemap.prototype.getTileFromWorldXY = /**
        * Get the tile located at specific position (in world coordinate) and layer. (thus you give a position of a point which is within the tile)
        * @param x {number} X position of the point in target tile.
        * @param x {number} Y position of the point in target tile.
        * @param [layer] {number} layer of this tile located.
        * @return {Tile} The tile with specific properties.
        */
        function (x, y, layer) {
            if (typeof layer === "undefined") { layer = this.currentLayer.ID; }
            return this.tiles[this.layers[layer].getTileFromWorldXY(x, y)];
        };
        Tilemap.prototype.getTileFromInputXY = /**
        * Gets the tile underneath the Input.x/y position
        * @param layer The layer to check, defaults to 0
        * @returns {Tile}
        */
        function (layer) {
            if (typeof layer === "undefined") { layer = this.currentLayer.ID; }
            return this.tiles[this.layers[layer].getTileFromWorldXY(this.game.input.worldX, this.game.input.worldY)];
        };
        Tilemap.prototype.getTileOverlaps = /**
        * Get tiles overlaps the given object.
        * @param object {GameObject} Tiles you want to get that overlaps this.
        * @return {array} Array with tiles information. (Each contains x, y and the tile.)
        */
        function (object) {
            return this.currentLayer.getTileOverlaps(object);
        };
        Tilemap.prototype.collide = //  COLLIDE
        /**
        * Check whether this tilemap collides with the given game object or group of objects.
        * @param objectOrGroup {function} Target object of group you want to check.
        * @param callback {function} This is called if objectOrGroup collides the tilemap.
        * @param context {object} Callback will be called with this context.
        * @return {bool} Return true if this collides with given object, otherwise return false.
        */
        function (objectOrGroup, callback, context) {
            if (typeof objectOrGroup === "undefined") { objectOrGroup = null; }
            if (typeof callback === "undefined") { callback = null; }
            if (typeof context === "undefined") { context = null; }
            if(callback !== null && context !== null) {
                this.collisionCallback = callback;
                this.collisionCallbackContext = context;
            }
            if(objectOrGroup == null) {
                objectOrGroup = this.game.world.group;
            }
            //  Group?
            if(objectOrGroup.isGroup == false) {
                this.collideGameObject(objectOrGroup);
            } else {
                objectOrGroup.forEachAlive(this, this.collideGameObject, true);
            }
        };
        Tilemap.prototype.collideGameObject = /**
        * Check whether this tilemap collides with the given game object.
        * @param object {GameObject} Target object you want to check.
        * @return {bool} Return true if this collides with given object, otherwise return false.
        */
        function (object) {
            if(object.body.type == Phaser.Types.BODY_DYNAMIC && object.exists == true && object.body.allowCollisions != Phaser.Types.NONE) {
                this._tempCollisionData = this.collisionLayer.getTileOverlaps(object);
                if(this.collisionCallback !== null && this._tempCollisionData.length > 0) {
                    this.collisionCallback.call(this.collisionCallbackContext, object, this._tempCollisionData);
                }
                return true;
            } else {
                return false;
            }
        };
        Tilemap.prototype.putTile = /**
        * Set a tile to a specific layer.
        * @param x {number} X position of this tile.
        * @param y {number} Y position of this tile.
        * @param index {number} The index of this tile type in the core map data.
        * @param [layer] {number} which layer you want to set the tile to.
        */
        function (x, y, index, layer) {
            if (typeof layer === "undefined") { layer = this.currentLayer.ID; }
            this.layers[layer].putTile(x, y, index);
        };
        Tilemap.prototype.preUpdate = /**
        * Can be over-ridden if required
        */
        function () {
        };
        Tilemap.prototype.update = /**
        * Can be over-ridden if required
        */
        function () {
        };
        Tilemap.prototype.postUpdate = /**
        * Can be over-ridden if required
        */
        function () {
        };
        Tilemap.prototype.destroy = function () {
            this.texture = null;
            this.transform = null;
            this.tiles.length = 0;
            this.layers.length = 0;
        };
        return Tilemap;
    })();
    Phaser.Tilemap = Tilemap;    
})(Phaser || (Phaser = {}));
