import { PinchButton } from "SpectaclesInteractionKit.lspkg/Components/UI/PinchButton/PinchButton";
import { Snap3DInteractableFactory } from "./Snap3DInteractableFactory";
import { LSTween } from "LSTween.lspkg/LSTween";
import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { ImageGenerator } from "./ImageGenerator";
/**
 * StoryViewer - Phase 1: Initial Dot Implementation with HTTP Request
 * Single dot appears at starting position when button is clicked, then fetches story data
 */
@component
export class StoryViewer extends BaseScriptComponent {
  @ui.separator
  @ui.label("Story Viewer - Phase 1: Initial Dot")
  
  // Core Components
  @input
  @hint("Button to trigger the story generation sequence")
  private generateButton: PinchButton;
  
  // Visual Feedback Elements
  @input
  @hint("Optional: Text component on button for state feedback")
  private buttonText: Text;
  
  @input
  @hint("Optional: Status display text")
  private statusDisplay: Text;
  
  @input
  @hint("Optional: Material for button color changes")
  private buttonMaterial: Material;
  
  // Internet Module for HTTP requests
  @input
  @hint("InternetModule asset for making HTTP requests")
  private internetModule: InternetModule;
  private statusDisplayTwo: Text; 
  
  // HTTP Request Settings
  @ui.separator
  @ui.label("API Configuration")
  
  @input
  @hint("API endpoint URL to fetch story data from")
  private apiEndpoint: string = "https://jsonplaceholder.typicode.com/posts/1";

  @input
  snap3DFactory: Snap3DInteractableFactory;
    
  // Phase 1 Settings
  @ui.separator
  @ui.label("Phase 1 Configuration")
  
  @input
  @hint("Local offset from button top where the dot should appear")
  private dotOffset: vec3 = new vec3(0, 0.06, 0);

@input private particlesObject: SceneObject;

@ui.separator
@ui.label("Image Display Configuration")

@input
@hint("SceneObject with Image component to display generated image")
private generatedImageDisplay: SceneObject;

@input
@hint("Enable/disable image display")
private useImageDisplay: boolean = true;

@ui.separator
@ui.label("Multiple Image Configuration")

@input
@hint("Array of 5 SceneObjects with Image components for displaying story images")
private imageDisplays: SceneObject[] = [];

@input
@hint("Horizontal spacing between images")
private horizontalSpacing: number = 0.4;

@input
@hint("Base offset position for the first image")
private baseImageOffset: vec3 = new vec3(0.3, 0, 0);

@ui.separator
@ui.label("Image Navigation")

@input
@hint("Button to generate/show next image")
private nextImageButton: PinchButton;

@input
@hint("Text component on next image button")
private nextImageButtonText: Text;

@ui.separator
@ui.label("Text Display Configuration")

@input
@hint("Array of 5 Text components to display prompts below images")
private promptTexts: Text[] = [];

@input
@hint("Vertical offset for text below images")
private textVerticalOffset: number = -0.15;

@input
@hint("Text color for prompts")
private promptTextColor: vec4 = new vec4(1, 1, 1, 1); // White by default

@input
@hint("Text size for prompts")
private promptTextSize: number = 0.8;

@input
@hint("Maximum width for text wrapping (in world units)")
private maxTextWidth: number = 0.3;

@input
@hint("Maximum number of characters per line for manual wrapping")
private maxCharsPerLine: number = 60;

@ui.separator
@ui.label("Text-to-Speech Configuration")

@input
@hint("TextToSpeechModule from the TTS asset")
private ttsModule: TextToSpeechModule;

@input
@hint("AudioComponent to play TTS audio")
private ttsAudioComponent: AudioComponent;

@input
@hint("TTS Voice Name (e.g., 'Sasha', 'Sam')")
private ttsVoiceName: string = "Sasha";

@input
@hint("TTS Voice Style (0-3 for different styles)")
private ttsVoiceStyle: number = 1;

@input
@hint("TTS Speech Pace (0.5 = slow, 1.0 = normal, 2.0 = fast)")
private ttsPace: number = 1.0;

@input
@hint("Enable/disable AI narration")
private enableNarration: boolean = true;

@input
@hint("Voice for narration (e.g., 'female', 'male')")
private narratorVoice: string = "Sasha";

@input
@hint("Speech rate (0.5 = slow, 1.0 = normal, 2.0 = fast)")
private speechRate: number = 1.0;

@input
@hint("Speech pitch (0.5 = low, 1.0 = normal, 2.0 = high)")
private speechPitch: number = 1.0;

@input
@hint("Volume for narration (0.0 to 1.0)")
private narratorVolume: number = 0.8;

// Add these properties to track current image state
private currentImageIndex: number = 0;
private totalPrompts: string[] = [];
private isWaitingForNextClick: boolean = false;

// Track multiple image generation
private generatedImages: Texture[] = [];
private currentImgIndex: number = 0;

// Add property to track current narration
private currentNarrationRequest: any = null;
private isNarrating: boolean = false;
  
  // Internal state
  private isAnimating: boolean = false;
  private currentTween: any = null;
  private storyData: any = null;
  private created3DObject: SceneObject = null;
  private rotationTween: LSTween = null;
  private rotationSpeed: number = 30; // degrees per second
  private updateEvent: UpdateEvent = null;

  private manipulateComponent: ManipulateComponent = null;
  private scaleThreshold: number = 1.5;
  private initialScale: vec3 = vec3.one(); // Store initial scale
  private hasTriggeredExpansion: boolean = false; // Prevent multiple triggers
  private imageGenerator: ImageGenerator = null;
  private isGeneratingImage: boolean = false;
  private currentTheme: string = "";
  

  onAwake() {
    this.imageGenerator = new ImageGenerator('Gemini');
    // Check internet availability first
    if (global.deviceInfoSystem.isInternetAvailable()) {
      print("StoryViewer: Internet is available");
    } else {
      print("StoryViewer: No internet connection");
      if (this.statusDisplay) {
        this.statusDisplay.text = "No internet connection";
      }
    }
    // Listen for internet status changes
    global.deviceInfoSystem.onInternetStatusChanged.add((args) => {
      if (args.isInternetAvailable) {
        print("StoryViewer: Internet connection restored");
        if (this.statusDisplay && this.statusDisplay.text === "No internet connection") {
          this.statusDisplay.text = "Ready";
        }
      } else {
        print("StoryViewer: Internet connection lost");
        if (this.statusDisplay) {
          this.statusDisplay.text = "No internet connection";
        }
      }
    });

    // attach onGenerateButtonPressed to generateButton
    this.createEvent("OnStartEvent").bind(() => {
      // Set up button click handler
      if (this.generateButton && this.generateButton.onButtonPinched) {
        this.generateButton.onButtonPinched.add(() => {
          this.onGenerateButtonPressed();
        });
      } else {
        print("StoryViewer: generateButton not properly configured");
      }

      // ADD THIS: Next image button click handler
      if (this.nextImageButton && this.nextImageButton.onButtonPinched) {
        this.nextImageButton.onButtonPinched.add(() => {
          print("StoryViewer: Next image button clicked!");
          this.onNextImageButtonPressed();
        });
      } else {
        print("StoryViewer: nextImageButton not properly configured");
      }
    });
    if (this.buttonText) this.buttonText.text = "Start Story";
    if (this.statusDisplay) this.statusDisplay.text = "Ready";

    this.setupNextImageButton();
  }

  private setupNextImageButton() {
  if (this.nextImageButton) {
    this.nextImageButton.enabled = false; // Hidden initially
  }
  if (this.nextImageButtonText) {
    this.nextImageButtonText.text = "Generate Next Image";
  }
}

private onNextImageButtonPressed() {
  if (!this.isWaitingForNextClick) {
    print("StoryViewer: Next image button clicked but not ready");
    return;
  }
  
  if (this.currentImageIndex >= this.totalPrompts.length) {
    print("StoryViewer: All images have been generated");
    if (this.statusDisplay) {
      this.statusDisplay.text = "All story images complete!";
    }
    this.nextImageButton.enabled = false;
    return;
  }
  
  print(`StoryViewer: Generating image ${this.currentImageIndex + 1}/${this.totalPrompts.length}`);
  this.generateNextImage();
}
  
  private onGenerateButtonPressed() {
    if (this.isAnimating) return; // Prevent multiple clicks
    
    // Check internet before starting
    if (!global.deviceInfoSystem.isInternetAvailable()) {
      print("StoryViewer: No internet connection available");
      if (this.statusDisplay) {
        this.statusDisplay.text = "No internet connection";
      }
      return;
    }
    
    this.startPhase1();
  }
  
  private startPhase1() {
    this.isAnimating = true;
    print("StoryViewer: Starting Phase 1 - fetching story data");
    
    // visual feedback
    if (this.buttonText) this.buttonText.text = "Fetching Story...";
    if (this.statusDisplay) this.statusDisplay.text = "Connecting to API...";
    
    // Make HTTP request
    this.fetchStoryData();
  }

  private async fetchStoryData() {
  try {
    if (!this.internetModule) {
      print("StoryViewer: InternetModule not configured");
      if (this.statusDisplay) this.statusDisplay.text = "Configuration error";
      return;
    }

    const request = new Request(this.apiEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await this.internetModule.fetch(request);
    
    if (response.status === 200) {
      const responseData = await response.json();
      this.storyData = responseData;
      
      print("StoryViewer: Story data fetched successfully");
      print("Story data: " + JSON.stringify(responseData));
      
      if (this.statusDisplay) this.statusDisplay.text = "Story loaded successfully!";
      if (this.buttonText) this.buttonText.text = "Story Ready";

      // print("Icon Category: " + responseData.stories[0].iconCategory);
      // this.generate3DSnap(responseData.stories[0].iconCategory);

      this.generate3DSnap(responseData.iconCategory);
      
      
    } else {
      print("StoryViewer: HTTP request failed with status: " + response.status);
      if (this.statusDisplay) this.statusDisplay.text = "Failed to load story";
    }
  } catch (error) {
    print("StoryViewer: Error fetching story data: " + error);
    if (this.statusDisplay) this.statusDisplay.text = "Network error";
  }
}

private async generate3DSnap(iconCategory: string) {
  print("StoryViewer: Generating 3D object with icon category: " + iconCategory);
  
  try {
    this.created3DObject = await this.snap3DFactory.createInteractable3DObject(
      iconCategory,
      this.generateButton.getTransform().getWorldPosition().add(this.dotOffset)
    );
    
    if (this.created3DObject) {
      print("StoryViewer: 3D object created successfully");
      this.setupScaleInteraction(this.created3DObject); // Add pinch interaction
      this.startContinuousRotation(); // Start rotation
    } else {
      print("StoryViewer: Warning - Could not find created 3D object");
    }
  } catch (error) {
    print("StoryViewer: Error creating 3D object: " + error);
  }
  
}

  private startContinuousRotation() {
  if (!this.created3DObject) {
    print("StoryViewer: No 3D object to rotate");
    return;
  }
  
  print("StoryViewer: Starting continuous rotation");
  
  // Create an update event that runs every frame
  this.updateEvent = this.createEvent("UpdateEvent");
  this.updateEvent.bind(() => {
    if (this.created3DObject) {
      const transform = this.created3DObject.getTransform();
      const currentRotation = transform.getLocalRotation();
      
      // Calculate rotation increment based on frame time
      const deltaTime = getDeltaTime();
      const rotationIncrement = this.rotationSpeed * deltaTime * MathUtils.DegToRad;
      
      // Create new rotation (rotating around Y-axis)
      const newRotationY = quat.angleAxis(rotationIncrement, vec3.up());
      const finalRotation = currentRotation.multiply(newRotationY); // Use the multiply method on the quat instance
      
      transform.setLocalRotation(finalRotation);
    }
  });
}
  private setupScaleInteraction(sceneObject: SceneObject) {
  if (!this.created3DObject) {
    print("StoryViewer: Cannot setup scale interaction - no 3D object");
    return;
  }
  
  try {
    // Store the initial scale
    this.initialScale = this.created3DObject.getTransform().getLocalScale();
    this.hasTriggeredExpansion = false;
    
    // Add Interactable component first
    const interactable = this.created3DObject.createComponent(Interactable.getTypeName());
    
    // Add ManipulateComponent for scale detection
    this.manipulateComponent = this.created3DObject.createComponent("Component.ManipulateComponent") as ManipulateComponent;

    // Configure the manipulate component
    this.manipulateComponent.enableManipulateType(ManipulateType.Scale, true);
    
    

    this.manipulateComponent.minScale = 0.5; // Minimum 50% of original size
    this.manipulateComponent.maxScale = 5.0; // Maximum 500% of original size

    print("StoryViewer: Scale interaction setup complete");
    print("Initial scale: " + this.initialScale.toString());
    print("Scale threshold: " + this.scaleThreshold);
  
    this.setupScaleMonitoring(this.created3DObject);

    print("StoryViewer: ManipulateComponent configured successfully");
    
  } catch (error) {
    print("StoryViewer: Error setting up scale interaction: " + error);
    // Fallback to simple tap detection
    this.setupSimpleTapInteraction(sceneObject);
  }
}

private setupScaleMonitoring(sceneObject: SceneObject) {
  // Create an update event to monitor scale changes
  const scaleMonitorEvent = this.createEvent("UpdateEvent");
  scaleMonitorEvent.bind(() => {
    if (!sceneObject || this.hasTriggeredExpansion) return;
    
    const currentScale = sceneObject.getTransform().getLocalScale();
    
    // Calculate the scale factor relative to initial scale
    const scaleFactor = currentScale.x / this.initialScale.x; // Use X component as reference
    
    // Check if scale exceeds threshold
    if (scaleFactor >= this.scaleThreshold) {
      print("StoryViewer: Scale threshold reached! Scale factor: " + scaleFactor);
      this.onScaleThresholdReached();
    }
  });
}

private triggerParticleEffect(): void {
  if (!this.particlesObject) {
    print("triggerParticleEffect: assign 'particlesObject' in the Inspector");
    return;
  }

  // If you want the burst at the newly created 3D model:
  if (this.created3DObject) {
    const pos = this.created3DObject.getTransform().getWorldPosition();
    this.particlesObject.getTransform().setWorldPosition(pos);
  }

  // Turn on for a short window
  this.particlesObject.enabled = true;

  const ev = this.createEvent("DelayedCallbackEvent");
  ev.bind(() => {
    this.particlesObject.enabled = false;
    print("StoryViewer: particle effect disabled after 5 seconds");
  });
  ev.reset(1.25);  // 5 seconds delay

  print("StoryViewer: particle burst fired");
}

// Called when scale threshold is reached
private onScaleThresholdReached() {
  if (this.hasTriggeredExpansion) return; // Prevent multiple triggers
  
  this.hasTriggeredExpansion = true;
  
  print("StoryViewer: 3D object scaled big enough!");

  // Stop rotation when threshold is reached
  if (this.updateEvent) {
    this.updateEvent.enabled = false;
    print("StoryViewer: Rotation stopped");
  }
  
  // // Disable further scaling to prevent interference
  // if (this.manipulateComponent) {
  //   this.manipulateComponent.enableScale = false;
  // }

  
  // Update status
  if (this.statusDisplay) {
    this.statusDisplay.text = "Scale threshold reached! Story expanding...";
  }

  this.triggerParticleEffect();
  
  // Trigger story expansion
  const delayedExpansion = this.createEvent("DelayedCallbackEvent");
  delayedExpansion.bind(() => {
    this.expandStory();
    this.created3DObject.enabled = false;
  });
  delayedExpansion.reset(0.1); // 0.5 second delay
}

// Fallback method for devices that don't support ManipulateComponent
private setupSimpleTapInteraction(sceneObject: SceneObject) {
  print("StoryViewer: Setting up simple tap interaction as fallback");
  
  const tapEvent = this.createEvent("TapEvent");
  tapEvent.bind(() => {
    print("StoryViewer: Tap detected, treating as scale trigger");
    this.onScaleThresholdReached();
  });
  
  print("StoryViewer: Simple tap interaction setup as fallback");
}

private expandStory() {
  // This is where you can add whatever functionality you want
  // when the 3D object is pinched
  
  if (this.storyData) {
    print("StoryViewer: Expanding story with data: " + JSON.stringify(this.storyData));
    
    // Example: Show story text
    if (this.statusDisplay) {
      this.statusDisplay.text = "Story: " + (this.storyData.title || "Your story here");
    }

    this.generateImageFromStory(this.storyData.theme);
    
    // You could also:
    // - Generate more 3D objects
    // - Show UI panels
    // - Trigger animations
    // - Play audio
    // - Open the StoryboardViewer component
  }  else {
    print("StoryViewer: No story data available for expansion");
    if (this.statusDisplay) {
      this.statusDisplay.text = "Story expanded (no data)";
    }
  }
}

// Create prompts from p1 to p5 descriptions
private createPromptsFromStoryData(): string[] {
  const prompts = [];
  
  if (!this.storyData) {
    print("StoryViewer: No story data available");
    return prompts;
  }
  
  // Extract descriptions from p1 to p5
  for (let i = 1; i <= 5; i++) {
    const key = `p${i}`;
    if (this.storyData[key] && this.storyData[key]['description']) {
      prompts.push(this.storyData[key]['description']);
      print(`StoryViewer: Found ${key} description: ${this.storyData[key]['description']}`);
    } else {
      print(`StoryViewer: No description found for ${key}`);
    }
  }
  
  print(`StoryViewer: Created ${prompts.length} prompts from story data`);
  return prompts;
}

private displayImageAtIndex(texture: Texture, index: number) {
  try {
    if (!texture) {
      print(`StoryViewer: Error - texture at index ${index} is null`);
      return;
    }
    
    // Use specific display object from the array
    let displayObject: SceneObject;
    
    if (this.imageDisplays && this.imageDisplays.length > index) {
      displayObject = this.imageDisplays[index];
    } else if (index === 0 && this.generatedImageDisplay) {
      // Fallback to main display for first image
      displayObject = this.generatedImageDisplay;
    } else {
      print(`StoryViewer: No display object available for index ${index}`);
      return;
    }
    
    if (displayObject) {
      const imageComponent = displayObject.getComponent("Component.Image") as Image;
      if (imageComponent) {
        imageComponent.mainPass.baseTex = texture;
        displayObject.enabled = true;
        
        // Position the image horizontally
        this.positionImageHorizontally(displayObject, index);
        
        // Display the text prompt below the image
        this.displayPromptText(index);
        
        print(`StoryViewer: Image ${index + 1} (p${index + 1}) displayed successfully with text`);
      } else {
        print(`StoryViewer: No Image component found on display object ${index}`);
      }
    }
    
  } catch (error) {
    print(`StoryViewer: Error displaying image ${index}: ${error}`);
  }
}

private displayPromptText(index: number) {
  try {
    print(`StoryViewer: === DEBUG displayPromptText for index ${index} ===`);
    
    // Hide all previous prompts when showing the current one
    this.hideAllPreviousPrompts(index);
    
    // Stop any current narration
    this.stopCurrentNarration();
    
    // Check if we have a text component for this index
    if (!this.promptTexts) {
      print(`StoryViewer: promptTexts array is null`);
      return;
    }
    
    print(`StoryViewer: promptTexts array length: ${this.promptTexts.length}`);
    
    if (this.promptTexts.length <= index) {
      print(`StoryViewer: Index ${index} is out of bounds for promptTexts array`);
      return;
    }
    
    if (!this.promptTexts[index]) {
      print(`StoryViewer: promptTexts[${index}] is null`);
      return;
    }
    
    // Check if we have the prompt for this index
    if (!this.totalPrompts) {
      print(`StoryViewer: totalPrompts array is null`);
      return;
    }
    
    print(`StoryViewer: totalPrompts array length: ${this.totalPrompts.length}`);
    
    if (this.totalPrompts.length <= index) {
      print(`StoryViewer: Index ${index} is out of bounds for totalPrompts array`);
      return;
    }
    
    const textComponent = this.promptTexts[index];
    const prompt = this.totalPrompts[index];
    
    print(`StoryViewer: Text component found: ${textComponent ? 'YES' : 'NO'}`);
    print(`StoryViewer: Prompt text: "${prompt}"`);
    print(`StoryViewer: Text component SceneObject: ${textComponent.getSceneObject() ? textComponent.getSceneObject().name : 'NO SCENE OBJECT'}`);
    
    // Wrap the text for better readability
    const wrappedText = this.wrapText(prompt, this.maxCharsPerLine);
    print(`StoryViewer: Wrapped text: "${wrappedText}"`);
    
    // Set the text content
    textComponent.text = wrappedText;
    print(`StoryViewer: Text content set`);
    
    // Configure text appearance
    textComponent.textFill.color = this.promptTextColor;
    textComponent.size = this.promptTextSize;
    print(`StoryViewer: Text appearance configured`);
    
    // Enable the text component's SceneObject
    const textSceneObject = textComponent.getSceneObject();
    if (textSceneObject) {
      textSceneObject.enabled = true;
      print(`StoryViewer: Text SceneObject enabled`);
    }
    
    // Enable the text component itself
    textComponent.enabled = true;
    print(`StoryViewer: Text component enabled`);
    
    // Position the text below the corresponding image
    this.positionPromptText(textComponent, index);
    
    // Start AI narration of the prompt
    this.narratePrompt(prompt, index);
    
    print(`StoryViewer: === END DEBUG for index ${index} ===`);
    
  } catch (error) {
    print(`StoryViewer: Error displaying prompt text ${index}: ${error}`);
  }
}

private async narratePrompt(prompt: string, index: number) {
  if (!this.enableNarration) {
    print(`StoryViewer: Narration disabled for prompt ${index + 1}`);
    return;
  }
  
  if (!this.ttsModule) {
    print(`StoryViewer: No TTS module configured for narration`);
    return;
  }
  
  try {
    print(`StoryViewer: Starting narration for prompt ${index + 1}: "${prompt.substring(0, 50)}..."`);
    
    // Update status to show narration is starting
    if (this.statusDisplay) {
      this.statusDisplay.text = `🎙️ Narrating story part ${index + 1}...`;
    }
    
    this.isNarrating = true;
    
    // Create TTS request
    const ttsRequest = {
      text: this.prepareTextForSpeech(prompt),
      voice: this.narratorVoice,
      rate: this.speechRate,
      pitch: this.speechPitch
    };
    
    // Generate speech audio using TTS module
    const audioTrack = await this.generateSpeechAudio(ttsRequest);
    
    if (audioTrack) {
      // If we have a separate audio component, use it
      if (this.ttsAudioComponent) {
        this.ttsAudioComponent.audioTrack = audioTrack;
        this.ttsAudioComponent.volume = this.narratorVolume;
        this.ttsAudioComponent.play(1);
        
        // Set up callback for when narration finishes
        this.setupTTSEndCallback(index);
      }
      
      print(`StoryViewer: TTS Narration started for prompt ${index + 1}`);
      
    } else {
      print(`StoryViewer: Failed to generate TTS audio for prompt ${index + 1}`);
      this.onNarrationComplete(index, false);
    }
    
  } catch (error) {
    print(`StoryViewer: Error in TTS narration for prompt ${index + 1}: ${error}`);
    this.onNarrationComplete(index, false);
  }
}

private setupTTSEndCallback(index: number) {
  if (!this.ttsAudioComponent) return;
  
  // Create an event to monitor when TTS audio finishes
  const audioEndEvent = this.createEvent("UpdateEvent");
  let hasEnded = false;
  
  audioEndEvent.bind(() => {
    if (!hasEnded && !this.ttsAudioComponent.isPlaying()) {
      hasEnded = true;
      audioEndEvent.enabled = false;
      this.onNarrationComplete(index, true);
    }
  });
}

private prepareTextForSpeech(text: string): string {
  // Clean up text for better TTS
  let speechText = text;
  
  // Add pauses for better pacing
  speechText = speechText.replace(/\./g, '... '); // Add pause after periods
  speechText = speechText.replace(/,/g, ', '); // Add slight pause after commas
  speechText = speechText.replace(/!/g, '! '); // Add pause after exclamations
  speechText = speechText.replace(/\?/g, '? '); // Add pause after questions
  
  // Remove any double spaces
  speechText = speechText.replace(/\s+/g, ' ').trim();
  
  return speechText;
}

private splitTextForTTS(text: string, maxLength: number = 400): string[] {
  // Split text into chunks to avoid TTS model's maximum sequence length limit
  // If text is within limit, return as single chunk
  if (text.length <= maxLength) {
    return [text];
  }
  
  const chunks: string[] = [];
  let currentText = text;
  
  while (currentText.length > maxLength) {
    let cutIndex = maxLength;
    
    // Try to find a good break point (sentence end)
    const sentenceEnd = currentText.lastIndexOf('. ', maxLength);
    if (sentenceEnd > maxLength * 0.5) { // At least halfway through
      cutIndex = sentenceEnd + 1;
    } else {
      // Try to find other punctuation
      const questionEnd = currentText.lastIndexOf('? ', maxLength);
      const exclamationEnd = currentText.lastIndexOf('! ', maxLength);
      const commaEnd = currentText.lastIndexOf(', ', maxLength);
      
      const bestEnd = Math.max(questionEnd, exclamationEnd, commaEnd);
      if (bestEnd > maxLength * 0.5) {
        cutIndex = bestEnd + 1;
      } else {
        // Find last space to avoid cutting words
        const lastSpace = currentText.lastIndexOf(' ', maxLength);
        if (lastSpace > maxLength * 0.7) { // At least 70% through
          cutIndex = lastSpace;
        }
      }
    }
    
    // Extract chunk and add to array
    const chunk = currentText.substring(0, cutIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    // Continue with remaining text
    currentText = currentText.substring(cutIndex).trim();
  }
  
  // Add remaining text if any
  if (currentText.length > 0) {
    chunks.push(currentText);
  }
  
  return chunks;
}

private async generateSpeechAudio(ttsRequest: any): Promise<AudioTrackAsset | null> {
  try {
    if (!this.ttsModule) {
      print("StoryViewer: TTS Module not configured");
      return null;
    }

    // Split text into chunks if it's too long for TTS (max 400 characters)
    const textChunks = this.splitTextForTTS(ttsRequest.text, 400);
    const textToSpeak = textChunks[0]; // Use first chunk for now
    
    if (textChunks.length > 1) {
      print(`StoryViewer: Text was too long (${ttsRequest.text.length} chars), using first chunk (${textToSpeak.length} chars)`);
    }

    print(`StoryViewer: Generating TTS for: "${textToSpeak.substring(0, 50)}..."`);

    // Create a promise to handle the async TTS callback
    return new Promise<AudioTrackAsset | null>((resolve, reject) => {
      try {
        // Create TTS options
        const options = TextToSpeech.Options.create();
        options.voiceName = this.ttsVoiceName || "Sasha";
        // options.voiceStyle = this.ttsVoiceStyle || 1;
        // options.pace = this.ttsPace || 1.0;

        // Success callback
        const onTTSComplete = (audioTrackAsset: AudioTrackAsset, wordInfo: TextToSpeech.WordInfo[], phonemeInfo: TextToSpeech.PhonemeInfo[], voiceStyle: any) => {
          print("StoryViewer: TTS audio generated successfully");
          resolve(audioTrackAsset);
        };

        // Error callback
        const onTTSError = (error: number, description: string) => {
          print(`StoryViewer: TTS error ${error}: ${description}`);
          resolve(null); // Resolve with null instead of rejecting to avoid breaking the app
        };

        // Call the TTS module with all 4 required parameters
        this.ttsModule.synthesize(
          textToSpeak,        // use chunked text instead of original
          options,            // TTS options
          onTTSComplete,      // success callback
          onTTSError         // error callback
        );

      } catch (error) {
        print(`StoryViewer: Error setting up TTS: ${error}`);
        resolve(null);
      }
    });

  } catch (error) {
    print(`StoryViewer: Error generating TTS audio: ${error}`);
    return null;
  }
}

// // Set up callback for when narration ends
// private setupNarrationEndCallback(index: number) {
//   if (!this.narratorAudioComponent) return;
  
//   // Create an event to monitor when audio finishes
//   const audioEndEvent = this.createEvent("UpdateEvent");
//   let hasEnded = false;
  
//   audioEndEvent.bind(() => {
//     if (!hasEnded && !this.narratorAudioComponent.isPlaying()) {
//       hasEnded = true;
//       audioEndEvent.enabled = false;
//       this.onNarrationComplete(index, true);
//     }
//   });
// }

// Called when narration completes (successfully or with error)
private onNarrationComplete(index: number, success: boolean) {
  this.isNarrating = false;
  
  if (success) {
    print(`StoryViewer: Narration completed for prompt ${index + 1}`);
    
    // Update status
    if (this.statusDisplay) {
      if (this.currentImageIndex < this.totalPrompts.length) {
        this.statusDisplay.text = `Story part ${index + 1} complete! Click for next`;
      } else {
        this.statusDisplay.text = `✨ All story parts complete! ✨`;
      }
    }
  } else {
    print(`StoryViewer: Narration failed for prompt ${index + 1}`);
    
    if (this.statusDisplay) {
      this.statusDisplay.text = `Story part ${index + 1} ready (narration unavailable)`;
    }
  }
}

// Update the stopCurrentNarration method:
private stopCurrentNarration() {
  if (this.isNarrating && this.ttsAudioComponent) {
    try {
      this.ttsAudioComponent.stop(false);
      print("StoryViewer: Stopped current TTS narration");
    } catch (error) {
      print(`StoryViewer: Error stopping TTS narration: ${error}`);
    }
  }
  
  this.isNarrating = false;
}

private hideAllPreviousPrompts(currentIndex: number) {
  if (!this.promptTexts) return;
  
  for (let i = 0; i < this.promptTexts.length; i++) {
    if (i !== currentIndex && this.promptTexts[i]) {
      // Hide both the text component and its scene object
      this.promptTexts[i].enabled = false;
      
      const textSceneObject = this.promptTexts[i].getSceneObject();
      if (textSceneObject) {
        textSceneObject.enabled = false;
      }
      
      print(`StoryViewer: Hidden prompt text ${i + 1}`);
    }
  }
}

private wrapText(text: string, maxCharsPerLine: number): string {
  if (!text || text.length <= maxCharsPerLine) {
    return text;
  }
  
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    // Check if adding this word would exceed the line limit
    if ((currentLine + word).length > maxCharsPerLine && currentLine.length > 0) {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  }
  
  // Add the last line
  if (currentLine.trim().length > 0) {
    lines.push(currentLine.trim());
  }
  
  return lines.join('\n');
}

private positionPromptText(textComponent: Text, index: number) {
  if (!textComponent) return;
  
  const textSceneObject = textComponent.getSceneObject();
  if (!textSceneObject) return;
  
  // Simple fixed position for testing
  const testPosition = new vec3(0, -40, -60); // 1 unit in front of camera, below center
  textSceneObject.getTransform().setWorldPosition(testPosition);
  
  print(`StoryViewer: Text ${index + 1} positioned at test location: ${testPosition.toString()}`);
}

// private positionImageHorizontally(displayObject: SceneObject, index: number) {
//   if (!displayObject) return;
  
//   let basePosition: vec3;
  
  
//   // Get base position from 3D object or button
//   if (this.created3DObject) {
//     basePosition = this.created3DObject.getTransform().getWorldPosition();
//   } else {
//     basePosition = this.generateButton.getTransform().getWorldPosition();
//   }
  
//   // Calculate horizontal position
//   // Start from the left and move right for each image
//   const totalImages = 5;
//   const startOffset = -(totalImages - 1) * this.horizontalSpacing / 2; // Center the row
//   const horizontalOffset = startOffset + (index * this.horizontalSpacing);
  
//   const finalPosition = basePosition
//     .add(this.baseImageOffset)
//     .add(new vec3(horizontalOffset, 0, 0));
  
//   displayObject.getTransform().setWorldPosition(finalPosition);
  
//   // // Make images face the camera
//   // const cameraTransform = global.scene.getCameraComponent().getTransform();
//   // displayObject.getTransform().lookAt(cameraTransform.getWorldPosition(), vec3.up());
  
//   print(`StoryViewer: Image ${index + 1} positioned at: ${finalPosition.toString()}`);
// }

private positionImageHorizontally(displayObject: SceneObject, index: number) {
  if (!displayObject) return;
  
  // Use the exact position from debug output - all images at same location
  const fixedPosition = new vec3(2.19027, -9.34762, -53.3637);
  
  displayObject.getTransform().setWorldPosition(fixedPosition);
  
  // // Make images face the camera (optional)
  // try {
  //   const camera = global.scene.findFirst("Camera");
  //   if (camera) {
  //     displayObject.getTransform().lookAt(camera.getTransform().getWorldPosition(), vec3.up());
  //   } else {
  //     const renderCamera = global.scene.getRenderCamera();
  //     if (renderCamera) {
  //       displayObject.getTransform().lookAt(renderCamera.getTransform().getWorldPosition(), vec3.up());
  //     }
  //   }
  // } catch (error) {
  //   print(`StoryViewer: Error making image face camera: ${error}`);
  // }
  
  print(`StoryViewer: Image ${index + 1} positioned at fixed location: ${fixedPosition.toString()}`);
}

private async generateImageFromStory(theme: string) {
  if (!this.imageGenerator) {
    print("StoryViewer: ImageGenerator not configured");
    if (this.statusDisplay) {
      this.statusDisplay.text = "Image generator not configured";
    }
    return;
  }
  
  if (this.isGeneratingImage) {
    print("StoryViewer: Image generation already in progress");
    return;
  }
  
  try {
    this.currentTheme = theme || "normal";

    // Initialize the image generation process
    this.generatedImages = [];
    this.currentImageIndex = 0;
    
    // Create prompts from p1 to p5
    this.totalPrompts = this.createPromptsFromStoryData(); // ADD this line - you were missing it!
    
    if (this.totalPrompts.length === 0) {
      print("StoryViewer: No valid prompts found in story data");
      if (this.statusDisplay) {
        this.statusDisplay.text = "No image descriptions found";
      }
      return;
    }
    
    print(`StoryViewer: Ready to generate ${this.totalPrompts.length} images from story data`);
    
    if (this.statusDisplay) {
      this.statusDisplay.text = "Ready to generate story images";
    }
    
    // Show the next image button and generate first image
    this.showNextImageButton();
    this.generateNextImage();
    
  } catch (error) {
    print("StoryViewer: Error setting up image generation: " + error);
    if (this.statusDisplay) {
      this.statusDisplay.text = "Failed to setup image generation";
    }
  }
}

private async generateNextImage() {
  if (this.currentImageIndex >= this.totalPrompts.length) {
    print("StoryViewer: All images generated");
    this.hideNextImageButton();
    return;
  }
  
  try {
    this.isGeneratingImage = true;
    this.isWaitingForNextClick = false;
    
    const raw_prompt = this.totalPrompts[this.currentImageIndex];
    const prefix = "Generate the following image using " + this.currentTheme + " style";

    const prompt = prefix + "\n\n" + raw_prompt;

    // Update button and status
    if (this.nextImageButtonText) {
      this.nextImageButtonText.text = "Generating...";
    }
    this.nextImageButton.enabled = false;
    
    if (this.statusDisplay) {
      this.statusDisplay.text = `Generating image ${this.currentImageIndex + 1}/${this.totalPrompts.length}...`;
    }
    
    print(`StoryViewer: Generating image ${this.currentImageIndex + 1} with prompt: ${prompt}`);
    
    const image = await this.imageGenerator.generateImage(prompt);
    
    if (image) {
      this.generatedImages.push(image);
      print(`StoryViewer: Image ${this.currentImageIndex + 1} generated successfully!`);
      
      // Display the image immediately
      this.displayImageAtIndex(image, this.currentImageIndex);
      
      // Move to next image
      this.currentImageIndex++;
      
      // Check if there are more images to generate
      if (this.currentImageIndex < this.totalPrompts.length) {
        // Enable button for next image
        this.isWaitingForNextClick = true;
        this.nextImageButton.enabled = true;
        
        if (this.nextImageButtonText) {
          this.nextImageButtonText.text = `Generate Image ${this.currentImageIndex + 1}`;
        }
        
        if (this.statusDisplay) {
          this.statusDisplay.text = `Image ${this.currentImageIndex}/${this.totalPrompts.length} ready! Click for next`;
        }
      } else {
        // All images generated
        if (this.statusDisplay) {
          this.statusDisplay.text = `✨ All ${this.generatedImages.length} Story Images Complete! ✨`;
        }
        this.hideNextImageButton();
      }
      
    } else {
      print(`StoryViewer: Failed to generate image ${this.currentImageIndex + 1}`);
      
      // Enable button to retry
      this.isWaitingForNextClick = true;
      this.nextImageButton.enabled = true;
      
      if (this.nextImageButtonText) {
        this.nextImageButtonText.text = "Retry Generation";
      }
      
      if (this.statusDisplay) {
        this.statusDisplay.text = "Image generation failed. Click to retry";
      }
    }
    
  } catch (error) {
    print(`StoryViewer: Error generating image ${this.currentImageIndex + 1}: ${error}`);
    
    // Enable button to retry
    this.isWaitingForNextClick = true;
    this.nextImageButton.enabled = true;
    
    if (this.nextImageButtonText) {
      this.nextImageButtonText.text = "Retry Generation";
    }
    
    if (this.statusDisplay) {
      this.statusDisplay.text = "Generation error. Click to retry";
    }
  } finally {
    this.isGeneratingImage = false;
  }
}

// Helper methods for button visibility
private showNextImageButton() {
  if (this.nextImageButton) {
    this.nextImageButton.enabled = true;
    this.isWaitingForNextClick = true;
  }
  
  if (this.nextImageButtonText) {
    this.nextImageButtonText.text = "Generate Image 1";
  }
}

private hideNextImageButton() {
  if (this.nextImageButton) {
    this.nextImageButton.enabled = false;
  }
  this.isWaitingForNextClick = false;
}

// private displayGeneratedImage(texture: Texture) {
//   try {
//     // Add validation before passing to spatial gallery
//     if (!texture) {
//       print("StoryViewer: Error - generated texture is null or undefined");
//       if (this.statusDisplay) {
//         this.statusDisplay.text = "Error: No image generated";
//       }
//       return;
//     }
    
//     if (this.useImageDisplay && this.generatedImageDisplay) {
//       // Get the Image component and set the texture
//       const imageComponent = this.generatedImageDisplay.getComponent("Component.Image") as Image;
//       if (imageComponent) {
//         imageComponent.mainPass.baseTex = texture;
//         this.generatedImageDisplay.enabled = true;
        
//         // Position the image near where the 3D object was
//         this.positionGeneratedImage();
        
//         print("StoryViewer: Image displayed successfully");
        
//         // Update status
//         if (this.statusDisplay) {
//           this.statusDisplay.text = "✨ Story Image Ready! ✨";
//         }
        
//         return;
//       } else {
//         print("StoryViewer: Error - No Image component found on generatedImageDisplay");
//       }
//     }
    
//     print("StoryViewer: Image display not configured");
    
//   } catch (error) {
//     print("StoryViewer: Error displaying image: " + error);
//   }
// }

private positionGeneratedImage() {
  if (!this.generatedImageDisplay) return;
  
  let targetPosition: vec3;
  
  // Position relative to where the 3D object was, or relative to the button
  if (this.created3DObject) {
    const objectPosition = this.created3DObject.getTransform().getWorldPosition();
    targetPosition = objectPosition.add(new vec3(0.3, 0, 0)); // Offset to the right
  } else {
    const buttonPosition = this.generateButton.getTransform().getWorldPosition();
    targetPosition = buttonPosition.add(new vec3(0.3, 0.1, 0)); // Offset right and up
  }
  
  this.generatedImageDisplay.getTransform().setWorldPosition(targetPosition);
  
  // // Optional: Make the image face the camera
  // const cameraTransform = global.scene.getCameraComponent().getTransform();
  // this.generatedImageDisplay.getTransform().lookAt(
  //   cameraTransform.getWorldPosition(), 
  //   vec3.up()
  // );
  
  print("StoryViewer: Image positioned at: " + targetPosition.toString());
}
}
