import type { PbxProfile } from "@/domain/pbx-profile";
import { Invitation, Inviter, Registerer, RegistererState, Session, SessionState, URI, UserAgent } from "sip.js";

export type RegisterStateChangeHandler = (state:RegistererState)=> void;
export type SipSessionStateChangeHandler=(state:SessionState)=>void;
export default class UserAgentManager {
  private _myName:string="mtiny-sip-phone-0.9";
  private _registerer:Registerer;
  private _ua:UserAgent;
  private _callStateChangeHandler?:SipSessionStateChangeHandler;
  private _config:PbxProfile;
  private _currentCallSession?: Session;

  constructor(
    config:PbxProfile,
    registerStateChangeHandler?:RegisterStateChangeHandler,
    callStateChangeHandler?:SipSessionStateChangeHandler
  ){
    this._config = config;
    const m = this;

    this._ua = new UserAgent({
      authorizationUsername: config.ext,
      authorizationPassword: config.password,
      contactName: config.ext,
      viaHost: config.domain,
      // displayName: ,
      transportOptions:{server:config.wsUrl},
      uri: UserAgent.makeURI(`sip:${config.ext}@${config.domain}`),
      userAgentString: m._myName,
      logLevel: "debug",
      delegate:{
        onInvite(invitation:Invitation) { m._handleOnInvite(invitation); },
        onConnect() { m._handleOnConnect(); },
        onDisconnect(err?:Error) { m._handleOnDisConnect(err); }
      }
    });

    this._registerer = new Registerer(this._ua);
    if(!!registerStateChangeHandler)
      this._registerer.stateChange.addListener(registerStateChangeHandler);
    this._callStateChangeHandler = callStateChangeHandler;

    this._ua.start()
      .then(()=>{

      })
      .catch(err=>{
        console.debug(this._myName,'Starting UA failed', err);
      });
  }


  MakeCall(callNumber: string){
    if(!!callNumber){
      const inviter = new Inviter(this._ua, 
        UserAgent.makeURI(`sip:${callNumber}@${this._config.domain}`) as URI, 
        {
          sessionDescriptionHandlerOptions: {
              constraints: { audio: true, video: false },
              // @ts-ignore: following property doesn't exist in the d.ts file, but it definitely does in the lib
              iceGatheringTimeout: this._config.iceGatheringTimeout || 3000
          },
          //inviteWithoutSdp: true
          earlyMedia: true,
        }
      );

      this._currentCallSession = inviter;
      if(this._callStateChangeHandler)
        inviter.stateChange.addListener(this._callStateChangeHandler)

      inviter.invite();

    }
  }

  Hangup(){
    if(!!this._currentCallSession){
      const session = this._currentCallSession;

      switch(session.state) {
        case SessionState.Initial:
        case SessionState.Establishing:
          if (session instanceof Inviter) {
            // An unestablished outgoing session
            session.cancel();
          } else if (session instanceof Invitation) {
            // An unestablished incoming session
            session.reject();
          }
          break;
        case SessionState.Established:
          // An established session
          session.bye();
          break;
        case SessionState.Terminating:
        case SessionState.Terminated:
          // Cannot terminate a session that is already terminated
          break;
        default:
          break;
      }      
     }
  }

  private _handleOnInvite(invitation:Invitation){
    if(!!this._callStateChangeHandler)
      invitation.stateChange.addListener(this._callStateChangeHandler);
    // number: invitation.remoteIdentity.uri.user,
    // via: invitation.remoteIdentity.displayName

    this._currentCallSession = invitation;
  }
  
  private _handleOnConnect(){
    this._registerer.register({
      requestDelegate: {
        onReject: (response) => {
          console.debug(this._myName, 'Registering has been rejected', response)
        }
      }
    });    
  }

  private _handleOnDisConnect(error?:Error){
    console.debug(this._myName, `UA disconnected.`);
    console.debug(this._myName, error);
    // On disconnect, cleanup invalid registrations
    this._registerer.unregister()
        .catch((e) => {
            // Unregister failed
        });
    // Only attempt to reconnect if network/server dropped the connection (if there is an error)
    if (error) {
        console.debug(this._myName, `attempting reconnect.`);
        this._attempReconnection();
    }
  }

  private _shouldBeConnected:boolean = true;// If false, reconnection attempts will be discontinued or otherwise prevented
  private _attemptingReconnection:boolean = false;// // Used to guard against overlapping reconnection attempts
  private _reconnectionAttempts:number = 4;// Number of times to attempt reconnection before giving up
  private _reconnectionDelay:number= 10;// Number of seconds to wait between reconnection attempts
  private _attempReconnection(reconnectionAttempt:number=1){
    // reconnectionAttempt = reconnectionAttempt || 1;
    // If not intentionally connected, don't reconnect.
    if (!this._shouldBeConnected)
        return;

    // Reconnection attempt already in progress
    if (this._attemptingReconnection)
        return;

    // Reconnection maximum attempts reached
    if (reconnectionAttempt > this._reconnectionAttempts) {
        //this.$emit('disabled');
        return;
    }

    // We're attempting a reconnection
    this._attemptingReconnection = true;

    setTimeout(() => {
      // If not intentionally connected, don't reconnect.
      if (!this._shouldBeConnected) {
          this._attemptingReconnection = false;
          return;
      }

      console.debug(`${this._myName}: attempting reconnect ${reconnectionAttempt}.`);
      // Attempt reconnect
      this._ua.reconnect()
        .then(() => {
            // Reconnect attempt succeeded
            this._attemptingReconnection = false;
        })
        .catch((error) => {
            // Reconnect attempt failed
            this._attemptingReconnection = false;
            this._attempReconnection(++reconnectionAttempt);
        });
    }, reconnectionAttempt === 1 ? 0 : this._reconnectionDelay * 1000);
  }  
  
}