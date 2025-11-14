// A port of Ken Perlin's JAVA reference implementation of the improved perlin noise function.
const PerlinNoise = {
    noise: function(x, y, z) {
        let p = new Array(512)
        let permutation = [ 151,160,137,91,90,15,
        131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
        190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
        88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
        77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
        102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
        135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
        5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
        223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
        129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
        251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
        49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
        138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
        ];
        for (let i=0; i < 256 ; i++) p[256+i] = p[i] = permutation[i]; 

        let X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
        x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
        let u = this.fade(x), v = this.fade(y), w = this.fade(z);
        let A = p[X]+Y, AA = p[A]+Z, AB = p[A+1]+Z, B = p[X+1]+Y, BA = p[B]+Z, BB = p[B+1]+Z;
        return this.scale(this.lerp(w, this.lerp(v, this.lerp(u, this.grad(p[AA], x, y, z), this.grad(p[BA], x-1, y, z)), this.lerp(u, this.grad(p[AB], x, y-1, z), this.grad(p[BB], x-1, y-1, z))), this.lerp(v, this.lerp(u, this.grad(p[AA+1], x, y, z-1), this.grad(p[BA+1], x-1, y, z-1)), this.lerp(u, this.grad(p[AB+1], x, y-1, z-1), this.grad(p[BB+1], x-1, y-1, z-1)))));
    },
    fade: function(t) { return t * t * t * (t * (t * 6 - 15) + 10); },
    lerp: function( t, a, b) { return a + t * (b - a); },
    grad: function(hash, x, y, z) {
        let h = hash & 15; let u = h<8 ? x : y, v = h<4 ? y : h==12||h==14 ? x : z;
        return ((h&1) == 0 ? u : -u) + ((h&2) == 0 ? v : -v);
    },
    scale: function(n) { return (1 + n)/2; }
}

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const gravitySlider = document.getElementById('gravity-slider');
    const distanceSlider = document.getElementById('distance-slider');
    const tiltSlider = document.getElementById('tilt-slider');
    const evaporateWaterBtn = document.getElementById('evaporate-water-btn');
    const introduceLifeBtn = document.getElementById('introduce-life-btn');
    const eruptVolcanoBtn = document.getElementById('erupt-volcano-btn');
    const synthesizeMethaneBtn = document.getElementById('synthesize-methane-btn');

    const canvas = document.getElementById('planet-canvas');

    // Info spans
    const gravityValueSpan = document.getElementById('gravity-value');
    const distanceValueSpan = document.getElementById('distance-value');
    const tiltValueSpan = document.getElementById('tilt-value');
    const tempInfo = document.getElementById('temp-info');
    const tiltInfo = document.getElementById('tilt-info');
    const atmoInfo = document.getElementById('atmo-info');
    const methaneInfo = document.getElementById('methane-info');
    const waterInfo = document.getElementById('water-info');
    const lifeInfo = document.getElementById('life-info');

    // Life conditions display
    const lifeCondWater = document.getElementById('life-cond-water');
    const lifeCondTemp = document.getElementById('life-cond-temp');


    // --- Game State ---
    const planetState = {
        gravity: 1.0, starDistance: 1.0, axialTilt: 0, methaneLevel: 0,
        temperature: 15, atmosphere: 1.0, hasSurfaceWater: false, hasLife: false,
        atmosphericWater: 0, cloudCover: 0,
    };

    // --- Three.js Setup ---
    let scene, camera, renderer, controls, sun, planetGroup, planet, atmosphere, moon, lifeGroup, planetAxis, oceanSphere, cloudSphere;
    let landTexture, displacementMap;
    let activeVolcanoes = [];
    let atmosphereFlash = 0;

    function createNoiseMap(size, frequency, isAlphaMap = false) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        const imageData = context.createImageData(size, size);
        const data = imageData.data;

        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                let phi = (x / size) * 2 * Math.PI;
                let theta = (y / size) * Math.PI;
                let sx = Math.cos(phi) * Math.sin(theta);
                let sy = Math.sin(phi) * Math.sin(theta);
                let sz = Math.cos(theta);

                let noise = PerlinNoise.noise(sx * frequency, sy * frequency, sz * frequency);
                const color = noise * 255;
                const i = (y * size + x) * 4;
                data[i] = isAlphaMap ? 255 : color;
                data[i + 1] = isAlphaMap ? 255 : color;
                data[i + 2] = isAlphaMap ? 255 : color;
                data[i + 3] = isAlphaMap ? color : 255;
            }
        }
        context.putImageData(imageData, 0, 0);
        return new THREE.CanvasTexture(canvas);
    }

    function createSolidTexture(color) {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext('2d');
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return new THREE.CanvasTexture(canvas);
    }

    function initThree() {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        camera.position.z = 5;
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        
        scene.add(new THREE.AmbientLight(0xffffff, 0.15));

        sun = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffdd00 }));
        scene.add(sun);
        sun.add(new THREE.PointLight(0xffffff, 1.5, 100));

        landTexture = createSolidTexture('#8B4513');
        displacementMap = createNoiseMap(256, 7);

        planetGroup = new THREE.Group();
        scene.add(planetGroup);

        const planetGeometry = new THREE.SphereGeometry(1, 128, 128);
        const planetMaterial = new THREE.MeshStandardMaterial({ 
            map: landTexture,
            displacementMap: displacementMap,
            displacementScale: 0.5
        });
        planet = new THREE.Mesh(planetGeometry, planetMaterial);
        planetGroup.add(planet);

        planetAxis = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        planetGroup.add(planetAxis);

        atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.3, 32, 32), new THREE.MeshStandardMaterial({ color: 0xadd8e6, transparent: true, opacity: 0.3 }));
        planetGroup.add(atmosphere);

        oceanSphere = new THREE.Mesh(new THREE.SphereGeometry(1.01, 128, 128), new THREE.MeshStandardMaterial({ color: 0x1e90ff, transparent: true, opacity: 0.7 }));
        oceanSphere.visible = false;
        planet.add(oceanSphere);

        const cloudAlphaMap = createNoiseMap(256, 5, true);
        cloudSphere = new THREE.Mesh(new THREE.SphereGeometry(1.25, 64, 64), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0, alphaMap: cloudAlphaMap }));
        planetGroup.add(cloudSphere);

        moon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), new THREE.MeshStandardMaterial({ color: 0xaaaaaa }));
        planet.add(moon);

        lifeGroup = new THREE.Group();
        planet.add(lifeGroup);

        animate();
    }

    function createVolcanoEffect() {
        const volcanoGroup = new THREE.Group();
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 16), new THREE.MeshStandardMaterial({ color: 0x5c3a21 }));
        cone.position.y = 0.15;
        volcanoGroup.add(cone);

        const smoke = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0x333333, size: 0.05, transparent: true, opacity: 0.8, sizeAttenuation: true }));
        const positions = new Float32Array(200 * 3);
        smoke.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        smoke.position.y = 0.3;
        smoke.userData.velocities = Array.from({length: 200}, () => new THREE.Vector3((Math.random() - 0.5) * 0.01, Math.random() * 0.02, (Math.random() - 0.5) * 0.01));
        volcanoGroup.add(smoke);

        const positionOnSurface = new THREE.Vector3().setFromSphericalCoords(1.25, Math.acos(Math.random() * 2 - 1), Math.random() * Math.PI * 2);
        volcanoGroup.position.copy(positionOnSurface);
        volcanoGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), positionOnSurface.clone().normalize());
        
        planet.add(volcanoGroup);
        activeVolcanoes.push({ group: volcanoGroup, smoke: smoke, lifetime: 0 });

        setTimeout(() => {
            volcanoGroup.remove(smoke);
            activeVolcanoes = activeVolcanoes.filter(v => v.group !== volcanoGroup);
        }, 7000);
    }

    let time = 0;
    function animate() {
        requestAnimationFrame(animate);
        const deltaTime = 0.015;
        time += deltaTime;

        planet.rotation.y += 0.005;
        moon.position.set(Math.cos(time * 0.9) * 1.5, 0, Math.sin(time * 0.9) * 1.5);
        cloudSphere.rotation.y += 0.001;

        const seasonalFactor = Math.sin(time * 0.5 * Math.PI);
        const seasonalTempChange = (planetState.axialTilt / 90) * 20 * seasonalFactor;
        
        updateSimulation(seasonalTempChange);

        activeVolcanoes.forEach(volcano => {
            volcano.lifetime += deltaTime;
            const positions = volcano.smoke.geometry.attributes.position.array;
            for (let i = 0; i < volcano.smoke.userData.velocities.length; i++) {
                positions[i*3] += volcano.smoke.userData.velocities[i].x * (1 + volcano.lifetime * 2);
                positions[i*3+1] += volcano.smoke.userData.velocities[i].y * (1 + volcano.lifetime * 2);
                positions[i*3+2] += volcano.smoke.userData.velocities[i].z * (1 + volcano.lifetime * 2);
            }
            volcano.smoke.geometry.attributes.position.needsUpdate = true;
            volcano.smoke.material.opacity = Math.max(0, 0.8 - volcano.lifetime / 5);
        });

        if (atmosphereFlash > 0) {
            atmosphereFlash -= deltaTime;
            atmosphere.material.color.setHSL(0.3, 0.5, atmosphereFlash * 0.5 + 0.5);
        } else {
            atmosphere.material.color.set(0xadd8e6);
        }

        // Animate life movement
        if (lifeGroup.visible) {
            lifeGroup.children.forEach(cube => {
                cube.userData.phi += (Math.random() - 0.5) * 0.005;
                cube.userData.theta += (Math.random() - 0.5) * 0.005;
                // Clamp theta to avoid poles
                cube.userData.theta = Math.max(0.1, Math.min(Math.PI - 0.1, cube.userData.theta));

                cube.position.setFromSphericalCoords(cube.userData.radius, cube.userData.phi, cube.userData.theta);
                cube.lookAt(new THREE.Vector3(0,0,0));
            });
        }

        controls.update();
        renderer.render(scene, camera);
    }

    function updateSimulation(seasonalTempChange = 0) {
        // Water Cycle Logic
        if (planetState.temperature < 25 && planetState.atmosphericWater > 0) {
            planetState.cloudCover += planetState.atmosphericWater;
            planetState.atmosphericWater = 0;
        }
        if (planetState.cloudCover > 5) {
            planetState.hasSurfaceWater = true;
            planetState.cloudCover = 0;
        }

        planetState.atmosphere = planetState.gravity;
        const baseTemp = 15 / (planetState.starDistance * planetState.starDistance);
        const greenhouseEffect = planetState.methaneLevel * 10;
        planetState.temperature = Math.round(baseTemp + greenhouseEffect + seasonalTempChange);
        
        sun.position.x = (planetState.starDistance - 1) * -15 - 5;
        planetGroup.rotation.z = THREE.MathUtils.degToRad(planetState.axialTilt);
        atmosphere.material.opacity = 0.3 + Math.min(planetState.atmosphere / 10, 0.4) + (planetState.methaneLevel * 0.05);

        oceanSphere.visible = planetState.hasSurfaceWater;
        cloudSphere.material.opacity = Math.min(planetState.cloudCover / 5, 0.7);

        lifeGroup.visible = planetState.hasLife;

        // Update UI Text
        document.getElementById('gravity-value').textContent = planetState.gravity.toFixed(1);
        document.getElementById('distance-value').textContent = planetState.starDistance.toFixed(1);
        document.getElementById('tilt-value').textContent = planetState.axialTilt;
        document.getElementById('temp-info').textContent = `${planetState.temperature}°C`;
        document.getElementById('tilt-info').textContent = `${planetState.axialTilt}°`;
        document.getElementById('atmo-info').textContent = planetState.atmosphere.toFixed(1);
        document.getElementById('methane-info').textContent = planetState.methaneLevel;
        document.getElementById('water-info').textContent = planetState.hasSurfaceWater ? '있음' : '없음';
        document.getElementById('life-info').textContent = planetState.hasLife ? '원시 생명체' : '없음';

        // Update life conditions display
        const waterMet = planetState.hasSurfaceWater;
        const tempMet = planetState.temperature > 0 && planetState.temperature < 50;

        lifeCondWater.querySelector('.status-indicator').textContent = waterMet ? 'O' : 'X';
        lifeCondWater.querySelector('.status-indicator').className = `status-indicator ${waterMet ? 'met' : 'not-met'}`;
        lifeCondTemp.querySelector('.status-indicator').textContent = tempMet ? 'O' : 'X';
        lifeCondTemp.querySelector('.status-indicator').className = `status-indicator ${tempMet ? 'met' : 'not-met'}`;


        introduceLifeBtn.disabled = !waterMet || !tempMet || planetState.hasLife;
        synthesizeMethaneBtn.disabled = !planetState.hasSurfaceWater;
    }

    // --- Event Listeners ---
    gravitySlider.addEventListener('input', (e) => { planetState.gravity = parseFloat(e.target.value); });
    distanceSlider.addEventListener('input', (e) => { planetState.starDistance = parseFloat(e.target.value); });
    tiltSlider.addEventListener('input', (e) => { planetState.axialTilt = parseInt(e.target.value); });

    eruptVolcanoBtn.addEventListener('click', () => {
        planetState.gravity += 0.1;
        gravitySlider.value = planetState.gravity;
        createVolcanoEffect();
    });

    synthesizeMethaneBtn.addEventListener('click', () => {
        if (planetState.hasSurfaceWater) {
            planetState.methaneLevel += 1;
            atmosphereFlash = 1.0;
        } else {
            alert('실패! 메탄을 합성하려면 먼저 물이 필요합니다.');
        }
    });

    evaporateWaterBtn.addEventListener('click', () => {
        planetState.atmosphericWater += 2;
        alert('대기 중에 수증기를 방출합니다. 온도가 충분히 낮아지면 구름이 형성됩니다.');
    });

    introduceLifeBtn.addEventListener('click', () => {
        const waterMet = planetState.hasSurfaceWater;
        const tempMet = planetState.temperature > 0 && planetState.temperature < 50;

        if (waterMet && tempMet && !planetState.hasLife) {
            planetState.hasLife = true;
            lifeGroup.clear();
            const lifeGeometry = new THREE.BoxGeometry(0.05, 0.1, 0.05);
            const lifeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            for (let i = 0; i < 150; i++) {
                const lifeCube = new THREE.Mesh(lifeGeometry, lifeMaterial);
                const phi = Math.random() * Math.PI * 2;
                const theta = Math.acos(Math.random() * 2 - 1);
                const radius = 1.3;
                lifeCube.position.setFromSphericalCoords(radius, phi, theta);
                lifeCube.lookAt(new THREE.Vector3(0,0,0));
                lifeCube.userData = { radius, phi, theta };
                lifeGroup.add(lifeCube);
            }
            alert('성공! 원시 생명체가 탄생했습니다.');
        } else {
            alert('실패! 생명체 생성 조건을 충족하지 못했습니다.');
        }
    });
    
    window.addEventListener('resize', () => {
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });

    function initialize() {
        initThree();
        // Initial UI update
        const updateUIText = () => {
            document.getElementById('gravity-value').textContent = planetState.gravity.toFixed(1);
            document.getElementById('distance-value').textContent = planetState.starDistance.toFixed(1);
            document.getElementById('tilt-value').textContent = planetState.axialTilt;
            document.getElementById('temp-info').textContent = `${planetState.temperature}°C`;
            document.getElementById('tilt-info').textContent = `${planetState.axialTilt}°`;
            document.getElementById('atmo-info').textContent = planetState.atmosphere.toFixed(1);
            document.getElementById('methane-info').textContent = planetState.methaneLevel;
            document.getElementById('water-info').textContent = planetState.hasSurfaceWater ? '있음' : '없음';
            document.getElementById('life-info').textContent = planetState.hasLife ? '원시 생명체' : '없음';
        };
        setInterval(updateUIText, 200); // Update UI text periodically
        updateSimulation();
    }

    initialize();
});