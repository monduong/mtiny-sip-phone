import type { UserAgentOptions } from "sip.js";
import type {SimpleUserOptions} from "sip.js/lib/platform/web";
import { SimpleUser } from "sip.js/lib/platform/web";

export default class SimpleUserManager {
  private simpleUser : null | SimpleUser = null
  server: string = ""
  
  constructor(){

  }

  initialize(sipUrl:string, 
    authorizationUsername:string, 
    authorizationPassword:string, 
    server:string, 
    callAudioElementId:string)
  {
    this.server = server;

    this.simpleUser = new SimpleUser(sipUrl,
      <SimpleUserOptions>{
        aor: `sip:${authorizationUsername}@${server}`,
        media: {
          constraints: { audio: true, video: false },
          remote: {
            audio: <HTMLAudioElement>document.getElementById(callAudioElementId)
          }
        },
        userAgentOptions: <UserAgentOptions>{
          authorizationUsername,
          authorizationPassword,
          logLevel: "debug"
        }      
      }
    );
  }

  startPhone(){
    this.simpleUser?.connect()
    .then(() => {
        // Register to receive inbound calls (optional)
        this.simpleUser?.register();
    });
  }

  stop(){
    this.simpleUser?.disconnect();
  }

  makeCall(number:string){
    this.simpleUser?.call(`sip:${number}@${this.server}`);
  }

  hangup(){
    this.simpleUser?.hangup();
  }

  isConnected(){
    return this.simpleUser?.isConnected();
  }

  test(){
    // @ts-ignore
    console.log(this.simpleUser.session);
  }
}