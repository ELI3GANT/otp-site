window.addEventListener("load", () => {
    // 1. Check if Curtains is loaded
    if(typeof Curtains === "undefined") return;

    // 2. Init Curtains
    // We use our existing div
    const webGLCurtain = new Curtains({
        container: "curtains-canvas",
        pixelRatio: Math.min(1.5, window.devicePixelRatio) // Perf optimization
    });

    webGLCurtain.onError(() => {
        document.body.classList.add("no-curtains");
    });

    // 3. Define Shaders
    // Distinct liquid displacement on mouse hover
    const vertexShader = `
        precision mediump float;

        attribute vec3 aVertexPosition;
        attribute vec2 aTextureCoord;

        uniform mat4 uMVMatrix;
        uniform mat4 uPMatrix;

        uniform float uTime;
        uniform vec2 uMouse;     // Mouse relative to plane
        uniform float uHover;    // 0.0 to 1.0

        varying vec3 vVertexPosition;
        varying vec2 vTextureCoord;

        void main() {
            vec3 vertexPosition = aVertexPosition;

            // Calculate distance from mouse to vertex
            float dist = distance(uMouse, vec2(vertexPosition.x, vertexPosition.y));
            
            // Ripple / Wave effect based on hover
            // We displace the Z position 
            float wave = sin(dist * 10.0 - uTime * 2.0) * 0.05;
            
            // Only apply if hovering
            vertexPosition.z += wave * uHover;

            gl_Position = uPMatrix * uMVMatrix * vec4(vertexPosition, 1.0);

            vTextureCoord = aTextureCoord;
            vVertexPosition = vertexPosition;
        }
    `;

    const fragmentShader = `
        precision mediump float;

        varying vec3 vVertexPosition;
        varying vec2 vTextureCoord;

        uniform sampler2D uSampler0;
        uniform float uTime;
        uniform float uHover;
        uniform vec2 uMouse;

        void main() {
            vec2 textureCoord = vTextureCoord;

            // Liquid distortion on texture coordinates
            // Distortion is stronger near mouse
            float dist = distance(uMouse, vec2(vVertexPosition.x, vVertexPosition.y));
            
            // Create a chromatic aberration effect
            // R channel offset
            vec2 rCoord = textureCoord;
            rCoord.x += (sin(rCoord.y * 20.0 + uTime) * 0.01 * uHover);
            
            // B channel offset
            vec2 bCoord = textureCoord;
            bCoord.x -= (sin(bCoord.y * 20.0 + uTime) * 0.01 * uHover);

            vec4 rColor = texture2D(uSampler0, rCoord);
            vec4 gColor = texture2D(uSampler0, textureCoord);
            vec4 bColor = texture2D(uSampler0, bCoord);

            gl_FragColor = vec4(rColor.r, gColor.g, bColor.b, 1.0);
        }
    `;

    // 4. Create Planes
    const planeElements = document.getElementsByClassName("project-img-static");
    
    // Params
    const params = {
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        widthSegments: 20,
        heightSegments: 20,
        uniforms: {
            time: { name: "uTime", type: "1f", value: 0 },
            mouse: { name: "uMouse", type: "2f", value: [0, 0] },
            hover: { name: "uHover", type: "1f", value: 0.0 }
        }
    };

    // Create a plane for each image
    for(let i = 0; i < planeElements.length; i++) {
        const plane = webGLCurtain.addPlane(planeElements[i], params);

        if(plane) {
            handlePlane(plane);
        }
    }

    function handlePlane(plane) {
        // Interaction Logic
        plane.onReady(() => {
            // Plane created
            // We set the HTML image to opacity 0 so we see the canvas version
            plane.htmlElement.style.opacity = 0;
        }).onRender(() => {
            // Update Time
            plane.uniforms.time.value++;
            
            // Sync plane position with DOM (Important if GSAP moves the card)
            plane.updatePosition();
        });

        // Mouse Interactivity
        // We use the Card wrapper for hit testing
        const card = plane.htmlElement.closest('.project-card');
        
        card.addEventListener("mouseenter", () => {
             gsap.to(plane.uniforms.hover, { value: 1.0, duration: 0.5 });
        });

        card.addEventListener("mouseleave", () => {
             gsap.to(plane.uniforms.hover, { value: 0.0, duration: 0.5 });
        });

        card.addEventListener("mousemove", (e) => {
             // Convert mouse to plane-local coordinates (-1 to 1)
             const mousePos = webGLCurtain.mouseToPlaneCoords(plane, e.clientX, e.clientY);
             plane.uniforms.mouse.value = [mousePos.x, mousePos.y];
        });
    }
});
