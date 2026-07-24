// ==================================================
// CASTLE-BG.JS - Ancient Royal Library Background
// ==================================================
// Fully self-contained Three.js background for members.html

(function () {
    if (typeof THREE === 'undefined') {
        console.error("Three.js is not loaded. Library background cannot initialize.");
        return;
    }

    // ==================================================
    // COLOR PALETTE & CONFIG
    // ==================================================
    const PALETTE = {
        woodDark: 0x1f120a,
        woodMedium: 0x331c0e,
        woodLight: 0x472814,
        carpet: 0x541e17,
        carpetBorder: 0x826034,
        stoneFloor: 0x2b2520,
        windowLight: 0xfff0d0,
        warmAmbient: 0x523f30,
        fog: 0x0f0b08,
        dust: 0xd9c29c,
        // Realistic medieval leather book spines
        bookColors: [
            0x2b130e, // Dark Mahogany
            0x18241b, // Aged Forest Green
            0x121b28, // Dark Royal Navy
            0x3d2817, // Weathered Brown Leather
            0x241111, // Deep Crimson
            0x191919, // Antique Charcoal
            0x4a371c  // Golden Brown
        ]
    };

    const CONFIG = {
        aisleWidth: 4.2,      // Spacing between left and right bookcases
        libraryLength: 30,    // Depth down Z axis
        shelfLevels: [0.3, 0.8, 1.3, 1.8, 2.3, 2.8, 3.3] // Y shelf positions
    };

    // ==================================================
    // GLOBALS
    // ==================================================
    let scene, camera, renderer, clock;
    let particleSystem;
    const animatables = [];

    document.addEventListener("DOMContentLoaded", init);

    // ==================================================
    // INITIALIZATION
    // ==================================================
    function init() {
        const canvas = document.getElementById("bgCanvas");
        if (!canvas) return;

        // 1. Renderer Setup
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.5;

        // 2. Scene & Fog Setup
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(PALETTE.fog, 0.025);
        scene.background = new THREE.Color(PALETTE.fog);

        // 3. Camera Setup
        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 1.6, 3.0);

        clock = new THREE.Clock();

        // 4. Build Environment
        buildLighting();
        buildFloorAndCarpet();
        buildBookcasesAndBooks();
        buildVaultedCeiling();
        buildEndWindowAndGlobe();
        buildDustParticles();

        // 5. Events & Render Loop
        window.addEventListener('resize', onWindowResize, false);
        renderer.setAnimationLoop(animate);
    }

    // ==================================================
    // SHARED MATERIALS
    // ==================================================
    // ==================================================
    // PROCEDURAL WOOD GRAIN TEXTURE GENERATOR
    // ==================================================
    // ==================================================
    // REPLACE WOOD TEXTURE & MATERIALS IN YOUR castle-bg.js
    // ==================================================
    function createWoodTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Deep dark wood base
        ctx.fillStyle = '#26140b';
        ctx.fillRect(0, 0, 256, 256);

        // Soft dark grain lines (no light pixels that trigger glints)
        for (let y = 0; y < 256; y += 3) {
            const alpha = Math.random() * 0.06;
            ctx.fillStyle = `rgba(10, 5, 2, ${alpha})`;
            ctx.fillRect(0, y, 256, 1.8);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    const woodTexture = createWoodTexture();

    const materials = {
        darkWood: new THREE.MeshStandardMaterial({
            color: 0x4a2e1b, // <-- CHANGED (Lighter mahogany tone)
            map: woodTexture,
            roughness: 0.95,
            metalness: 0.0
        }),
        medWood: new THREE.MeshStandardMaterial({
            color: 0x6a4328, // <-- CHANGED (Warm medium oak tone)
            map: woodTexture,
            roughness: 0.92,
            metalness: 0.0
        }),
        stone: new THREE.MeshStandardMaterial({ color: (PALETTE && PALETTE.stoneFloor) || 0x2b2520, roughness: 0.9, metalness: 0.05 }),
        carpet: new THREE.MeshStandardMaterial({ color: (PALETTE && PALETTE.carpet) || 0x541e17, roughness: 0.95, metalness: 0.0 }),
        carpetGold: new THREE.MeshStandardMaterial({ color: (PALETTE && PALETTE.carpetBorder) || 0x826034, roughness: 1.0, metalness: 0.0 }),
        windowGlow: new THREE.MeshBasicMaterial({ color: 0xffd99b }),
        goldTrim: new THREE.MeshStandardMaterial({ color: 0x997631, roughness: 0.5, metalness: 0.5 })
    };
// This is a single-line JS comment
    // ==================================================
    // LIGHTING
    // ==================================================
    // ==================================================
    // REPLACE ONLY THIS FUNCTION IN YOUR castle-bg.js
    // ==================================================
    function buildLighting() {
        // Dimmed warm ambient light (toned down from 1.8 to 0.95)
        const ambientLight = new THREE.AmbientLight(0x38281c, 1.1);
        scene.add(ambientLight);

        // Dimmed sunlight coming from the rear window (toned down from 3.2 to 1.6)
        const windowLight = new THREE.DirectionalLight(0xffd99b, 1.9);
        windowLight.position.set(0, 3.0, -CONFIG.libraryLength / 2 - 2);
        windowLight.target.position.set(0, 1.5, 0);
        scene.add(windowLight);
        scene.add(windowLight.target);

        // Dimmed sconce lights along the library aisle (toned down intensity & range)
        for (let z = 2; z > -CONFIG.libraryLength / 2; z -= 7) {
            const sconceLight = new THREE.PointLight(0xff8833, 0.9, 5.5);
            sconceLight.position.set(0, 2.5, z);
            sconceLight.decay = 2.2;
            scene.add(sconceLight);
        }
    }

    // ==================================================
    // FLOOR & CARPET RUNNER
    // ==================================================
    function buildFloorAndCarpet() {
        const totalDepth = CONFIG.libraryLength + 10;

        const floorGeo = new THREE.PlaneGeometry(12, totalDepth);
        const floor = new THREE.Mesh(floorGeo, materials.stone);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, 0, -totalDepth / 2 + 5);
        scene.add(floor);

        const carpetGeo = new THREE.PlaneGeometry(1.6, totalDepth);
        const carpet = new THREE.Mesh(carpetGeo, materials.carpet);
        carpet.rotation.x = -Math.PI / 2;
        carpet.position.set(0, 0.01, -totalDepth / 2 + 5);
        scene.add(carpet);

        [-0.82, 0.82].forEach(x => {
            const borderGeo = new THREE.PlaneGeometry(0.06, totalDepth);
            const border = new THREE.Mesh(borderGeo, materials.carpetGold);
            border.rotation.x = -Math.PI / 2;
            border.position.set(x, 0.015, -totalDepth / 2 + 5);
            scene.add(border);
        });
    }

    // ==================================================
    // BOOKCASES & REALISTIC INSTANCED BOOKS
    // ==================================================
    function buildBookcasesAndBooks() {
        const sectionLength = 3.6;
        const numSections = Math.floor(CONFIG.libraryLength / sectionLength);
        const shelfDepth = 0.55;
        const xOffset = CONFIG.aisleWidth / 2 + shelfDepth / 2;

        const bookTransforms = [];
        const bookColorIndices = [];

        [-1, 1].forEach(side => {
            const currentX = xOffset * side;

            for (let i = 0; i < numSections; i++) {
                const zPos = 3 - (i * sectionLength);

                // Vertical Frames
                const pillarGeo = new THREE.BoxGeometry(0.16, 3.8, shelfDepth + 0.08);
                const pillar = new THREE.Mesh(pillarGeo, materials.medWood);
                pillar.position.set(currentX, 1.9, zPos + sectionLength / 2);
                scene.add(pillar);

                // Carved Capital
                const capGeo = new THREE.BoxGeometry(0.22, 0.25, shelfDepth + 0.15);
                const cap = new THREE.Mesh(capGeo, materials.darkWood);
                cap.position.set(currentX, 3.8, zPos + sectionLength / 2);
                scene.add(cap);

                // Section Badge
                const tagGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16);
                const tag = new THREE.Mesh(tagGeo, materials.goldTrim);
                tag.rotation.z = Math.PI / 2;
                tag.position.set(currentX + (side * -0.09), 2.8, zPos + sectionLength / 2);
                scene.add(tag);

                // Horizontal Shelves & Books
                CONFIG.shelfLevels.forEach(yLevel => {
                    const shelfGeo = new THREE.BoxGeometry(shelfDepth, 0.04, sectionLength);
                    const shelf = new THREE.Mesh(shelfGeo, materials.darkWood);
                    shelf.position.set(currentX, yLevel, zPos);
                    scene.add(shelf);

                    // Fill Shelves with Small, Recessed Books
                    let currentZ = zPos + (sectionLength / 2) - 0.12;

                    while (currentZ > zPos - (sectionLength / 2) + 0.12) {
                        const bookThickness = 0.025 + Math.random() * 0.025; // 2.5cm - 5cm along Z
                        const bookHeight = 0.20 + Math.random() * 0.08;       // 20cm - 28cm along Y
                        const bookDepth = 0.20 + Math.random() * 0.05;        // 20cm - 25cm along X

                        // Recess book deep inside shelf
                        const depthOffset = (shelfDepth / 2) - (bookDepth / 2) - 0.04;
                        const bookX = currentX + (depthOffset * -side);
                        const bookY = yLevel + (bookHeight / 2) + 0.02;
                        const bookZ = currentZ;

                        const matrix = new THREE.Matrix4();
                        const rotation = new THREE.Euler(
                            (Math.random() - 0.5) * 0.03,
                            0,
                            (Math.random() - 0.5) * 0.04
                        );
                        const scale = new THREE.Vector3(bookDepth, bookHeight, bookThickness);

                        matrix.compose(
                            new THREE.Vector3(bookX, bookY, bookZ),
                            new THREE.Quaternion().setFromEuler(rotation),
                            scale
                        );

                        bookTransforms.push(matrix);
                        bookColorIndices.push(Math.floor(Math.random() * PALETTE.bookColors.length));

                        currentZ -= (bookThickness + 0.008);
                    }
                });

                // Solid Wood Backing Board
                const backGeo = new THREE.BoxGeometry(0.04, 3.8, sectionLength);
                const back = new THREE.Mesh(backGeo, materials.darkWood);
                back.position.set(currentX + ((shelfDepth / 2 + 0.02) * side), 1.9, zPos);
                scene.add(back);
            }
        });

        // Master Instanced Mesh for Books
        const masterBookGeo = new THREE.BoxGeometry(1, 1, 1);
        const bookMat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.1 });
        const instancedBooks = new THREE.InstancedMesh(masterBookGeo, bookMat, bookTransforms.length);

        const colorHelper = new THREE.Color();
        for (let i = 0; i < bookTransforms.length; i++) {
            instancedBooks.setMatrixAt(i, bookTransforms[i]);
            colorHelper.setHex(PALETTE.bookColors[bookColorIndices[i]]);
            instancedBooks.setColorAt(i, colorHelper);
        }

        scene.add(instancedBooks);
    }

    // ==================================================
    // REPLACE ONLY THIS FUNCTION IN YOUR castle-bg.js
    // ==================================================
    function buildVaultedCeiling() {
        const ceilingGroup = new THREE.Group();
        const startZ = 12;
        const endZ = -(CONFIG.libraryLength || 32) - 15;
        const depth = Math.abs(endZ - startZ);
        const centerZ = (startZ + endZ) / 2;

        const darkWoodMat = (materials && materials.darkWood)
            ? materials.darkWood
            : new THREE.MeshStandardMaterial({ color: 0x1f120a, roughness: 0.85 });

        // 1. SOLID CEILING CAP (Seals top roof peak)
        const topCapGeo = new THREE.PlaneGeometry(8.0, depth);
        const topCap = new THREE.Mesh(topCapGeo, darkWoodMat);
        topCap.rotation.x = Math.PI / 2;
        topCap.position.set(0, 5.25, centerZ);
        ceilingGroup.add(topCap);

        // 2. ANGLED ROOF PANELS
        const panelWidth = 3.2;
        const pitchAngle = 0.48; // ~27 degrees slant

        const leftRoof = new THREE.Mesh(new THREE.PlaneGeometry(panelWidth, depth), darkWoodMat);
        leftRoof.rotation.x = Math.PI / 2;
        leftRoof.rotation.y = pitchAngle;
        leftRoof.position.set(-1.35, 4.4, centerZ);
        ceilingGroup.add(leftRoof);

        const rightRoof = new THREE.Mesh(new THREE.PlaneGeometry(panelWidth, depth), darkWoodMat);
        rightRoof.rotation.x = Math.PI / 2;
        rightRoof.rotation.y = -pitchAngle;
        rightRoof.position.set(1.35, 4.4, centerZ);
        ceilingGroup.add(rightRoof);

        // 3. CORRECTED A-FRAME ROOF TRUSSES (Angling UPWARDS to form an A-shape)
        for (let z = startZ; z > endZ; z -= 3.2) {
            // Horizontal Cross Tie-Beam
            const beamGeo = new THREE.BoxGeometry((CONFIG.aisleWidth || 4.2) + 0.8, 0.16, 0.16);
            const beam = new THREE.Mesh(beamGeo, darkWoodMat);
            beam.position.set(0, 3.6, z);
            ceilingGroup.add(beam);

            // Left Slanted Rafter (Rises UP toward the center peak)
            const leftRafter = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.14, 0.14), darkWoodMat);
            leftRafter.position.set(-1.05, 4.25, z);
            leftRafter.rotation.z = pitchAngle; // Positive rotation tilts right side UP
            ceilingGroup.add(leftRafter);

            // Right Slanted Rafter (Rises UP toward the center peak)
            const rightRafter = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.14, 0.14), darkWoodMat);
            rightRafter.position.set(1.05, 4.25, z);
            rightRafter.rotation.z = -pitchAngle; // Negative rotation tilts left side UP
            ceilingGroup.add(rightRafter);
        }

        scene.add(ceilingGroup);
    }

    // ==================================================
    // END WINDOW & GLOBE
    // ==================================================
    function buildEndWindowAndGlobe() {
        const windowZ = -CONFIG.libraryLength / 2 - 1;

        // Arch Frame
        const frameGeo = new THREE.RingGeometry(1.2, 2.2, 16, 1, 0, Math.PI);
        const frame = new THREE.Mesh(frameGeo, materials.darkWood);
        frame.position.set(0, 2.2, windowZ);
        scene.add(frame);

        // Glowing Glass
        const paneGeo = new THREE.CircleGeometry(1.8, 16, 0, Math.PI);
        const pane = new THREE.Mesh(paneGeo, materials.windowGlow);
        pane.position.set(0, 2.2, windowZ - 0.05);
        scene.add(pane);

        const lowerWindowGeo = new THREE.PlaneGeometry(3.6, 2.0);
        const lowerPane = new THREE.Mesh(lowerWindowGeo, materials.windowGlow);
        lowerPane.position.set(0, 1.0, windowZ - 0.05);
        scene.add(lowerPane);

        // Window Grids
        const gridMat = materials.darkWood;
        const vGrid = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.2, 0.05), gridMat);
        vGrid.position.set(0, 1.6, windowZ);
        scene.add(vGrid);

        [-0.8, 0.8].forEach(x => {
            const vg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3.2, 0.05), gridMat);
            vg.position.set(x, 1.6, windowZ);
            scene.add(vg);
        });

        // Globe
        const globeGroup = new THREE.Group();
        globeGroup.position.set(0, 0.85, windowZ + 2.5);

        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.25, 0.8, 12), materials.darkWood);
        stand.position.y = -0.4;
        globeGroup.add(stand);

        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.02, 8, 24), materials.goldTrim);
        ring.rotation.x = Math.PI / 3;
        globeGroup.add(ring);

        const sphereMat = new THREE.MeshStandardMaterial({ color: 0x2b4c6f, roughness: 0.4 });
        const globe = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), sphereMat);
        globeGroup.add(globe);

        scene.add(globeGroup);

        animatables.push({
            update: (time) => {
                globe.rotation.y = time * 0.15;
            }
        });
    }

    // ==================================================
    // FLOATING DUST PARTICLES
    // ==================================================
    function buildDustParticles() {
        const count = 500;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 3.5;
            positions[i * 3 + 1] = Math.random() * 4.0;
            positions[i * 3 + 2] = (Math.random() - 0.5) * CONFIG.libraryLength;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: PALETTE.dust,
            size: 0.035,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending
        });

        particleSystem = new THREE.Points(geometry, material);
        scene.add(particleSystem);

        animatables.push({
            update: (time) => {
                const pos = particleSystem.geometry.attributes.position.array;
                for (let i = 0; i < count; i++) {
                    pos[i * 3 + 1] += Math.sin(time + i) * 0.0008 + 0.0008;
                    pos[i * 3] += Math.cos(time * 0.5 + i) * 0.0005;

                    if (pos[i * 3 + 1] > 4.2) pos[i * 3 + 1] = 0.2;
                }
                particleSystem.geometry.attributes.position.needsUpdate = true;
            }
        });
    }

    // ==================================================
    // ANIMATION & BREATHING CAMERA
    // ==================================================
    function animate() {
        const time = clock.getElapsedTime();

        for (let i = 0; i < animatables.length; i++) {
            animatables[i].update(time);
        }

        camera.position.x = Math.sin(time * 0.25) * 0.05;
        camera.position.y = 1.6 + Math.cos(time * 0.35) * 0.025;
        camera.lookAt(0, 1.55, -CONFIG.libraryLength / 2);

        renderer.render(scene, camera);
    }

    // ==================================================
    // RESIZE EVENT
    // ==================================================
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

})();