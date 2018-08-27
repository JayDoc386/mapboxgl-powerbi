module powerbi.extensibility.visual.data {
    declare var turf: any;

    export class BBoxCache {
        private cache: {}
        private usedSourceId: string
        private usedSettings: ChoroplethSettings

        public getBBox(featureNames: string[]): number[] {
            const features = featureNames.map(featureName => this.cache[featureName]).filter(feature => feature != null)
            if (!features.length) {
                return null
            }
            const featureCollection = turf.helpers.featureCollection(features)
            return turf.bbox(featureCollection)
        }

        public update(map: mapboxgl.Map, sourceId: string, settings: ChoroplethSettings) {
            if (this.hasSourceChanged(sourceId, settings)) {
                this.reset(map, sourceId, settings)
            }
            else {
                this.updateCache(map)
            }
        }

        private hasSourceChanged(sourceId: string, settings: ChoroplethSettings) {
            if (this.usedSourceId != sourceId) {
                return true
            }

            if (settings.hasChanged(this.usedSettings)) {
                return true
            }

            return false
        }

        private reset(map: mapboxgl.Map, sourceId: string, settings: ChoroplethSettings) {
            this.cache = {}
            this.usedSourceId = sourceId
            this.usedSettings = settings

            map.zoomTo(0, { animate: false })
            this.updateCache(map)
        }

        private updateCache(map: mapboxgl.Map) {
            const vectorPropertyName = this.usedSettings.getCurrentVectorProperty()
            const sourceFeaturesByName = map.querySourceFeatures(this.usedSourceId, { sourceLayer: this.usedSettings.getCurrentSourceLayer() })
                .reduce((result, feature) => {
                    if (!feature) {
                        return result
                    }

                    const featureName = feature.properties[vectorPropertyName]

                    if (result[featureName]) {
                        result[featureName].push(feature)
                    }
                    else {
                        result[featureName] = [feature]
                    }

                    return result
                }, {})

            Object.keys(sourceFeaturesByName).forEach((featureName) => {
                const featureArray = sourceFeaturesByName[featureName]
                const cachedFeaturePolygon = this.cache[featureName]
                if (cachedFeaturePolygon) {
                    featureArray.push(cachedFeaturePolygon)
                }
                const featureCollection = turf.helpers.featureCollection(featureArray)
                const newFeaturePolygon = turf.bboxPolygon(turf.bbox(featureCollection))
                this.cache[featureName] = newFeaturePolygon
            })
        }
    }
}
